import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { existsSync } from "fs";
import { useEffect, useState } from "react";

import { jumpToSession, getTerminalLabel } from "./actions";
import {
  loadSessions,
  displayName,
  contextLine,
  relativeTime,
  sourceLabel,
  statusGroup,
  groupSessions,
  needsAttention,
  formatToolDisplay,
  resetSession,
  getSessionsDir,
} from "./sessions";
import {
  statusColor,
  statusLabel,
  statusDescription,
  statusIcon,
} from "./status-ui";
import { CctopSession } from "./types";

/** Check if sessions come from multiple sources (CC + OC) */
function hasMultipleSources(sessions: CctopSession[]): boolean {
  if (sessions.length === 0) return false;
  const firstSource = sessions[0].source ?? null;
  return sessions.some((s) => (s.source ?? null) !== firstSource);
}

/** Whether to use sectioned display: >= 3 sessions AND >= 2 status groups */
function useSections(sessions: CctopSession[]): boolean {
  if (sessions.length < 3) return false;
  const groups = new Set(sessions.map((s) => statusGroup(s.status)));
  return groups.size >= 2;
}

/** Build accessories array for a session list item */
function sessionAccessories(
  session: CctopSession,
  showSource: boolean,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (showSource) {
    const label = sourceLabel(session);
    accessories.push({
      tag: { value: label, color: label === "OC" ? Color.Blue : Color.Orange },
    });
  }

  accessories.push({
    tag: { value: session.branch, color: Color.SecondaryText },
  });
  accessories.push({ text: relativeTime(session.last_activity) });
  accessories.push({
    tag: {
      value: statusLabel(session.status),
      color: statusColor(session.status),
    },
  });

  return accessories;
}

/** Detail pane showing full session metadata */
function SessionDetail({ session }: { session: CctopSession }) {
  const toolDisplay = session.last_tool
    ? formatToolDisplay(session.last_tool, session.last_tool_detail)
    : undefined;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusDescription(session.status)}
              color={statusColor(session.status)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Project"
            text={session.project_name}
          />
          {session.session_name &&
            session.session_name !== session.project_name && (
              <List.Item.Detail.Metadata.Label
                title="Session Name"
                text={session.session_name}
              />
            )}
          <List.Item.Detail.Metadata.Label
            title="Branch"
            text={session.branch}
          />
          <List.Item.Detail.Metadata.Label
            title="Path"
            text={session.project_path}
          />
          <List.Item.Detail.Metadata.Label
            title="Terminal"
            text={getTerminalLabel(session)}
          />
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={session.source === "opencode" ? "opencode" : "Claude Code"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Started"
            text={relativeTime(session.started_at)}
          />
          <List.Item.Detail.Metadata.Label
            title="Last Activity"
            text={relativeTime(session.last_activity)}
          />
          {toolDisplay && (
            <List.Item.Detail.Metadata.Label
              title="Last Tool"
              text={toolDisplay}
            />
          )}
          {session.last_prompt && (
            <List.Item.Detail.Metadata.Label
              title="Last Prompt"
              text={session.last_prompt}
            />
          )}
          {session.status === "waiting_permission" &&
            session.notification_message && (
              <List.Item.Detail.Metadata.Label
                title="Notification"
                text={session.notification_message}
              />
            )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** Action panel for a session item */
function SessionActions({
  session,
  isShowingDetail,
  onToggleDetail,
  revalidate,
}: {
  session: CctopSession;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  revalidate: () => void;
}) {
  const terminalName = getTerminalLabel(session);
  return (
    <ActionPanel>
      <Action
        title={`Open in ${terminalName}`}
        icon={Icon.Terminal}
        onAction={() => jumpToSession(session)}
      />
      {session.status !== "idle" && (
        <Action
          title="Reset to Idle"
          icon={Icon.ArrowCounterClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            try {
              resetSession(session);
              revalidate();
              await showToast({
                style: Toast.Style.Success,
                title: "Session reset to idle",
              });
            } catch (e) {
              await showFailureToast(e, { title: "Failed to reset session" });
            }
          }}
        />
      )}
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={onToggleDetail}
      />
      <Action.CopyToClipboard
        title="Copy Project Path"
        content={session.project_path}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Session Id"
        content={session.session_id}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.Open
        title="Open in Finder"
        target={session.project_path}
        application="Finder"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );
}

/** Render a single session as a List.Item */
function SessionItem({
  session,
  showSource,
  isShowingDetail,
  onToggleDetail,
  revalidate,
}: {
  session: CctopSession;
  showSource: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  revalidate: () => void;
}) {
  return (
    <List.Item
      key={session.pid?.toString() ?? session.session_id}
      icon={statusIcon(session.status)}
      title={displayName(session)}
      subtitle={contextLine(session) ?? undefined}
      accessories={sessionAccessories(session, showSource)}
      detail={isShowingDetail ? <SessionDetail session={session} /> : undefined}
      actions={
        <SessionActions
          session={session}
          isShowingDetail={isShowingDetail}
          onToggleDetail={onToggleDetail}
          revalidate={revalidate}
        />
      }
    />
  );
}

/** Filter sessions based on the selected dropdown value */
function filterSessions(
  sessions: CctopSession[],
  filter: string,
): CctopSession[] {
  switch (filter) {
    case "attention":
      return sessions.filter((s) => needsAttention(s.status));
    case "active":
      return sessions.filter(
        (s) => s.status === "working" || s.status === "compacting",
      );
    case "idle":
      return sessions.filter((s) => s.status === "idle");
    default:
      return sessions;
  }
}

export default function ShowSessions() {
  const {
    data: sessions,
    revalidate,
    isLoading,
  } = useCachedPromise(async () => loadSessions());
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [filter, setFilter] = useState("all");

  // Restore persisted detail toggle preference
  useEffect(() => {
    LocalStorage.getItem<boolean>("showDetail").then((val) => {
      if (val !== undefined) setIsShowingDetail(val);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(revalidate, 2000);
    return () => clearInterval(interval);
  }, [revalidate]);

  const allSessions = sessions ?? [];
  const filteredSessions = filterSessions(allSessions, filter);
  const showSource = hasMultipleSources(allSessions);
  const sectioned = useSections(filteredSessions);

  const toggleDetail = () => {
    setIsShowingDetail((prev) => {
      const next = !prev;
      LocalStorage.setItem("showDetail", next);
      return next;
    });
  };

  const attentionCount = allSessions.filter((s) =>
    needsAttention(s.status),
  ).length;
  const sessionWord = allSessions.length === 1 ? "session" : "sessions";
  const navTitle =
    attentionCount > 0
      ? `${allSessions.length} sessions (${attentionCount} need attention)`
      : `${allSessions.length} ${sessionWord}`;

  const dirExists = existsSync(getSessionsDir());

  const renderItem = (session: CctopSession) => (
    <SessionItem
      key={session.pid?.toString() ?? session.session_id}
      session={session}
      showSource={showSource}
      isShowingDetail={isShowingDetail}
      onToggleDetail={toggleDetail}
      revalidate={revalidate}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={navTitle}
      searchBarPlaceholder="Search sessions..."
      actions={
        !dirExists ? (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Setup Guide"
              url="https://github.com/st0012/cctop#readme"
            />
          </ActionPanel>
        ) : undefined
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          onChange={setFilter}
          storeValue
        >
          <List.Dropdown.Item title="All Sessions" value="all" />
          <List.Dropdown.Item title="Needs Attention" value="attention" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Idle" value="idle" />
        </List.Dropdown>
      }
    >
      {dirExists ? (
        <List.EmptyView
          title={
            allSessions.length > 0 && filteredSessions.length === 0
              ? "No Matching Sessions"
              : "No Active Sessions"
          }
          description={
            allSessions.length > 0 && filteredSessions.length === 0
              ? "Try changing the filter to see more sessions"
              : "Start a Claude Code or opencode session to see it here"
          }
          icon={
            allSessions.length > 0 && filteredSessions.length === 0
              ? Icon.Filter
              : Icon.Monitor
          }
        />
      ) : (
        <List.EmptyView
          title="cctop Not Installed"
          description="Install cctop to monitor your AI coding sessions"
          icon={Icon.Download}
        />
      )}
      {sectioned
        ? groupSessions(filteredSessions).map(({ group, sessions: items }) => (
            <List.Section
              key={group}
              title={group}
              subtitle={`${items.length}`}
            >
              {items.map(renderItem)}
            </List.Section>
          ))
        : filteredSessions.map(renderItem)}
    </List>
  );
}
