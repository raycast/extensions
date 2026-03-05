import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
  useNavigation,
} from "@raycast/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  listSessions,
  getSession,
  terminateSession,
  getSessionUrl,
  getSessionsPageUrl,
  getPrUrl,
  normalizeStatus,
  SessionSummary,
  SessionStatus,
} from "./api";
import SessionDetailView from "./session-detail";
import { SendMessageForm, EditTagsForm } from "./session-forms";

const STATUS_CONFIG: Record<SessionStatus, { icon: Icon; tint: Color; label: string }> = {
  working: { icon: Icon.CircleProgress, tint: Color.Blue, label: "Working" },
  blocked: { icon: Icon.ExclamationMark, tint: Color.Orange, label: "Needs Input" },
  finished: { icon: Icon.CheckCircle, tint: Color.Green, label: "Finished" },
  expired: { icon: Icon.Clock, tint: Color.SecondaryText, label: "Expired" },
  suspended: { icon: Icon.Pause, tint: Color.Yellow, label: "Suspended" },
  unknown: { icon: Icon.QuestionMarkCircle, tint: Color.SecondaryText, label: "Unknown" },
};

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ---------- Session List Item ----------

function truncate(text: string, maxLen: number): string {
  const oneLine = text.replace(/\n/g, " ").trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen - 1) + "\u2026" : oneLine;
}

function SessionListItem({
  session,
  lastMessage,
  onArchive,
  onMessageSent,
  onTagsSaved,
}: {
  session: SessionSummary;
  lastMessage?: string;
  onArchive: (id: string) => Promise<void>;
  onMessageSent: () => void;
  onTagsSaved: () => void;
}) {
  const { push } = useNavigation();
  const status = normalizeStatus(session.status, session.status_enum);
  const config = STATUS_CONFIG[status];
  const sessionUrl = getSessionUrl(session.session_id);
  const title = session.title || `Session ${session.session_id.slice(0, 8)}`;
  const isActive = status === "working" || status === "blocked";
  const canMessage = status !== "expired" && status !== "unknown";
  const subtitle = lastMessage ? truncate(lastMessage, 60) : (session.requesting_user_email ?? undefined);

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[
        ...(session.pull_request ? [{ icon: Icon.Link, tooltip: "Has PR" }] : []),
        ...(session.tags?.length ? [{ tag: { value: session.tags[0], color: Color.Purple } }] : []),
        { text: formatRelativeTime(session.updated_at) },
        { icon: { source: config.icon, tintColor: config.tint }, tooltip: config.label },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Session">
            <Action
              title="View Details"
              icon={Icon.Eye}
              onAction={() => push(<SessionDetailView sessionId={session.session_id} />)}
            />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={sessionUrl}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action.CopyToClipboard
              title="Copy Session URL"
              content={sessionUrl}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Session Id"
              content={session.session_id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {canMessage && (
            <ActionPanel.Section title="Communicate">
              <Action
                title="Send Message"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={() =>
                  push(<SendMessageForm sessionId={session.session_id} sessionTitle={title} onSent={onMessageSent} />)
                }
              />
            </ActionPanel.Section>
          )}
          {session.pull_request && (
            <ActionPanel.Section title="Pull Request">
              <Action.OpenInBrowser
                title="Open Pull Request"
                url={getPrUrl(session.pull_request.url)}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Manage">
            <Action
              title="Edit Tags"
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() =>
                push(
                  <EditTagsForm
                    sessionId={session.session_id}
                    sessionTitle={title}
                    currentTags={session.tags ?? []}
                    onSaved={onTagsSaved}
                  />,
                )
              }
            />
            {isActive && (
              <Action
                title="Archive Session"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => onArchive(session.session_id)}
              />
            )}
            <Action.OpenInBrowser
              title="Open All Sessions"
              url={getSessionsPageUrl()}
              icon={Icon.AppWindowList}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type FilterValue = "all" | "active" | "finished";

const LIST_POLL_INTERVAL_MS = 10000;

export default function ListSessions() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});

  const {
    data: sessions,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return await listSessions(100);
  }, []);

  // Fetch last message for active sessions
  useEffect(() => {
    if (!sessions) return;
    const activeIds = sessions
      .filter((s) => {
        const st = normalizeStatus(s.status, s.status_enum);
        return st === "working" || st === "blocked" || st === "suspended";
      })
      .map((s) => s.session_id);

    if (activeIds.length === 0) return;

    let cancelled = false;
    Promise.all(activeIds.map((id) => getSession(id).catch(() => null))).then((details) => {
      if (cancelled) return;
      const msgs: Record<string, string> = { ...lastMessages };
      for (const d of details) {
        if (d && d.messages.length > 0) {
          msgs[d.session_id] = d.messages[d.messages.length - 1].message;
        }
      }
      setLastMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  // Auto-refresh: poll the list while any session is active
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  const hasActive = (sessions ?? []).some((s) => {
    const st = normalizeStatus(s.status, s.status_enum);
    return st === "working" || st === "blocked" || st === "suspended";
  });

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => revalidateRef.current(), LIST_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasActive]);

  const handleArchive = useCallback(
    async (sessionId: string) => {
      if (
        await confirmAlert({
          title: "Archive Session",
          message: "This will terminate the session. Are you sure?",
          primaryAction: { title: "Archive", style: Alert.ActionStyle.Destructive },
        })
      ) {
        try {
          await terminateSession(sessionId);
          showToast({ style: Toast.Style.Success, title: "Session archived" });
          revalidate();
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to archive",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    },
    [revalidate],
  );

  const filteredSessions = (sessions ?? []).filter((s) => {
    const status = normalizeStatus(s.status, s.status_enum);
    if (filter === "active") return status === "working" || status === "blocked" || status === "suspended";
    if (filter === "finished") return status === "finished" || status === "expired";
    return true;
  });

  const activeSessions = filteredSessions.filter((s) => {
    const status = normalizeStatus(s.status, s.status_enum);
    return status === "working" || status === "blocked" || status === "suspended";
  });

  const completedSessions = filteredSessions.filter((s) => {
    const status = normalizeStatus(s.status, s.status_enum);
    return status !== "working" && status !== "blocked" && status !== "suspended";
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as FilterValue)}>
          <List.Dropdown.Item title="All Sessions" value="all" icon={Icon.BulletPoints} />
          <List.Dropdown.Item title="Active" value="active" icon={Icon.CircleProgress} />
          <List.Dropdown.Item title="Completed" value="finished" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
    >
      <List.Item
        title="Create a New Session"
        icon={{ source: Icon.Plus, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action
              title="Create Session"
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "new-session", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      {filteredSessions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No sessions found"
          description="Launch a new Devin session to get started"
          icon={Icon.Rocket}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Devin" url={getSessionsPageUrl()} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {activeSessions.length > 0 && (
            <List.Section title="Active" subtitle={`${activeSessions.length}`}>
              {activeSessions.map((session) => (
                <SessionListItem
                  key={session.session_id}
                  session={session}
                  lastMessage={lastMessages[session.session_id]}
                  onArchive={handleArchive}
                  onMessageSent={revalidate}
                  onTagsSaved={revalidate}
                />
              ))}
            </List.Section>
          )}
          {completedSessions.length > 0 && (
            <List.Section title="Completed" subtitle={`${completedSessions.length}`}>
              {completedSessions.map((session) => (
                <SessionListItem
                  key={session.session_id}
                  session={session}
                  lastMessage={lastMessages[session.session_id]}
                  onArchive={handleArchive}
                  onMessageSent={revalidate}
                  onTagsSaved={revalidate}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
