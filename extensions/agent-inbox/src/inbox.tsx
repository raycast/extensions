import { SessionLoadError } from "./components/SessionLoadError";
import { openSessionCommand } from "./lib/launch";
import { statusLabel } from "./core/format";
import { isClaudeCloudOnly } from "./core/claude-desktop";
import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, LaunchProps, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { allAdapters } from "./core/adapters";
import { agentHostLabel, hostTag, rowTime } from "./core/format";
import { projectName } from "./core/paths";
import { groupInbox, InboxSection } from "./core/status";
import { Config, Session } from "./core/types";
import { agentIcon, statusDot } from "./components/icons";
import { ConnectionActions } from "./components/ConnectionActions";
import { SessionDetail } from "./components/SessionDetail";
import { extensionConfig } from "./lib/env";
import { activeSessions, jumpBack, store } from "./lib/sessions";

interface JumpContext {
  jump?: { agent: string; sessionId: string };
}

const SECTIONS: { key: InboxSection; title: string }[] = [
  { key: "needs_input", title: "Waiting for You" },
  { key: "subscribed", title: "Subscribed" },
  { key: "done", title: "Completed" },
];

export default function Inbox(props: LaunchProps<{ launchContext?: JumpContext }>) {
  const config = extensionConfig();
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(activeSessions, [], {
    keepPreviousData: true,
  });
  useEffect(() => {
    const timer = setInterval(() => {
      void revalidate();
    }, 2000);
    return () => clearInterval(timer);
  }, [revalidate]);
  const connected = useCachedPromise(async () => allAdapters().some((a) => a.detect().hooked), []);

  useConfirmJump(props.launchContext, config);

  const groups = groupInbox(data ?? []);
  const empty = !isLoading && SECTIONS.every((s) => groups[s.key].length === 0);

  async function update(fn: () => Promise<unknown>, optimistic: (list: Session[]) => Session[]) {
    await mutate(fn(), { optimisticUpdate: (list) => optimistic(list ?? []) });
  }

  if (error && !data?.length) return <SessionLoadError error={error} retry={revalidate} isLoading={isLoading} />;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && !empty}
      searchBarPlaceholder="Search"
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
    >
      {empty && connected.data === false ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No agent connected yet"
          description="Choose Connect an Agent from the action menu, then subscribe to a session"
          actions={
            <ActionPanel>
              <ConnectionActions />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Bell}
          title="No subscribed sessions"
          description="Subscribe in All Sessions to follow progress and jump back"
          actions={
            <ActionPanel>
              <Action
                title="Browse All Sessions"
                icon={Icon.List}
                onAction={() => openSessionCommand("all-sessions")}
              />
              <ConnectionActions />
            </ActionPanel>
          }
        />
      )}
      {SECTIONS.map(({ key, title }) => (
        <List.Section key={key} title={title} subtitle={search.trim() ? undefined : String(groups[key].length)}>
          {groups[key].map((s) => (
            <InboxItem
              key={`${s.agent}:${s.sessionId}`}
              session={s}
              config={config}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail((v) => !v)}
              onHandled={async () => {
                await update(
                  () => store.markHandled(s.agent, s.sessionId),
                  (list) => list.filter((x) => !(x.agent === s.agent && x.sessionId === s.sessionId)),
                );
                await showHUD("Handled · " + (s.title || s.sessionId));
              }}
              onToggleSubscribe={async () => {
                const next = !s.subscribed;
                await update(
                  () => store.setSubscribed(s.agent, s.sessionId, next),
                  (list) =>
                    list.map((x) =>
                      x.agent === s.agent && x.sessionId === s.sessionId ? { ...x, subscribed: next } : x,
                    ),
                );
              }}
              onArchiveDone={async () => {
                let n = 0;
                await update(
                  async () => (n = await store.archiveDone(Date.now(), await activeSessions())),
                  (list) => list.filter((x) => x.status !== "done"),
                );
                await showHUD("Archived " + n + " completed sessions");
              }}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function InboxItem(props: {
  session: Session;
  config: Config;
  showDetail: boolean;
  onToggleDetail: () => void;
  onHandled: () => void;
  onToggleSubscribe: () => void;
  onArchiveDone: () => void;
  onRefresh: () => void;
}) {
  const { session: s, config, showDetail } = props;
  const cloud = isClaudeCloudOnly(s);
  const dot = statusDot(s);
  const accessories: List.Item.Accessory[] | undefined = showDetail ? undefined : [];
  if (accessories) {
    if (dot) accessories.push({ icon: dot, tooltip: statusLabel(s) });
    if (cloud) accessories.push({ icon: Icon.Cloud, tooltip: "Claude cloud conversation" });
    else if (!showDetail && (s.status === "ready" || s.status === "unknown"))
      accessories.push({ text: statusLabel(s) });
    if (!showDetail && (!cloud || s.updatedAt)) accessories.push({ text: rowTime(s) });
  }

  return (
    <List.Item
      id={`${s.agent}:${s.sessionId}`}
      icon={agentIcon(s.agent, !s.subscribed)}
      title={s.title || s.sessionId}
      subtitle={showDetail ? undefined : [projectName(s.cwd), hostTag(s.host)].filter(Boolean).join(" · ")}
      keywords={[projectName(s.cwd), s.summary].filter(Boolean)}
      accessories={accessories}
      detail={<SessionDetail session={s} />}
      actions={
        <ActionPanel title={s.title}>
          <ActionPanel.Section>
            {/* Keep the same primary and secondary actions as All Sessions. */}
            <Action title="Jump to Session" icon={Icon.ArrowNe} onAction={() => jumpBack(s, config)} />
            <Action
              title={s.subscribed ? "Unsubscribe" : "Subscribe"}
              icon={s.subscribed ? Icon.BellDisabled : Icon.Bell}
              onAction={props.onToggleSubscribe}
            />
            <Action
              title="Mark as Handled"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={props.onHandled}
            />
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={props.onToggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Archive Completed"
              icon={Icon.Tray}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={props.onArchiveDone}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
            <ConnectionActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * Clicking a notification opens raycast://…/inbox?context={"jump":{…}}. Ask once, then jump.
 * Inside the inbox ↵ jumps without asking.
 */
function useConfirmJump(context: JumpContext | undefined, config: Config) {
  const asked = useRef(false);
  useEffect(() => {
    const target = context?.jump;
    if (!target || asked.current) return;
    asked.current = true;
    (async () => {
      const s = await store.get(target.agent, target.sessionId);
      if (!s) return;
      const ok = await confirmAlert({
        icon: Icon.ArrowNe,
        title: "Jump back to " + agentHostLabel(s.agent, s.host) + "?",
        message: s.title || s.sessionId,
        primaryAction: { title: "Jump to Session", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel" },
      });
      if (ok) await jumpBack(s, config);
    })();
  }, [context?.jump?.agent, context?.jump?.sessionId]);
}
