import { statusLabel } from "./core/format";
import { isClaudeCloudOnly } from "./core/claude-desktop";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchProps,
  LaunchType,
  List,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { allAdapters } from "./core/adapters";
import { agentHostLabel, hostTag, rowTime } from "./core/format";
import { Translator } from "./core/messages";
import { projectName } from "./core/paths";
import { groupInbox, InboxSection } from "./core/status";
import { Config, Session } from "./core/types";
import { agentIcon, statusDot } from "./components/icons";
import { ConnectionActions } from "./components/ConnectionActions";
import { SessionDetail } from "./components/SessionDetail";
import { locale } from "./lib/env";
import { activeSessions, jumpBack, store } from "./lib/sessions";

interface JumpContext {
  jump?: { agent: string; sessionId: string };
}

const SECTIONS: { key: InboxSection; title: "section.needsInput" | "section.subscribed" | "section.done" }[] = [
  { key: "needs_input", title: "section.needsInput" },
  { key: "subscribed", title: "section.subscribed" },
  { key: "done", title: "section.done" },
];

export default function Inbox(props: LaunchProps<{ launchContext?: JumpContext }>) {
  const { t, config } = locale();
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, revalidate, mutate } = useCachedPromise(activeSessions, [], { keepPreviousData: true });
  useEffect(() => {
    const timer = setInterval(() => {
      void revalidate();
    }, 2000);
    return () => clearInterval(timer);
  }, [revalidate]);
  const connected = useCachedPromise(async () => allAdapters().some((a) => a.detect().hooked), []);

  useConfirmJump(props.launchContext, config, t);

  const groups = groupInbox(data ?? []);
  const empty = !isLoading && SECTIONS.every((s) => groups[s.key].length === 0);

  async function update(fn: () => Promise<unknown>, optimistic: (list: Session[]) => Session[]) {
    await mutate(fn(), { optimisticUpdate: (list) => optimistic(list ?? []) });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && !empty}
      searchBarPlaceholder={t("search.placeholder")}
      onSearchTextChange={setSearch}
      filtering={{ keepSectionOrder: true }}
    >
      {empty && connected.data === false ? (
        <List.EmptyView
          icon={Icon.Plug}
          title={t("empty.onboard.title")}
          description={t("empty.onboard.desc")}
          actions={
            <ActionPanel>
              <ConnectionActions />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Bell}
          title={t("empty.inbox.title")}
          description={t("empty.inbox.desc")}
          actions={
            <ActionPanel>
              <Action
                title={t("action.openAll")}
                icon={Icon.List}
                onAction={() => launchCommand({ name: "all-sessions", type: LaunchType.UserInitiated })}
              />
              <ConnectionActions />
            </ActionPanel>
          }
        />
      )}
      {SECTIONS.map(({ key, title }) => (
        <List.Section key={key} title={t(title)} subtitle={search.trim() ? undefined : String(groups[key].length)}>
          {groups[key].map((s) => (
            <InboxItem
              key={`${s.agent}:${s.sessionId}`}
              session={s}
              t={t}
              config={config}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail((v) => !v)}
              onHandled={async () => {
                await update(
                  () => store.markHandled(s.agent, s.sessionId),
                  (list) => list.filter((x) => !(x.agent === s.agent && x.sessionId === s.sessionId)),
                );
                await showHUD(t("hud.handled", { title: s.title || s.sessionId }));
              }}
              onToggleSubscribe={async () => {
                const next = !s.subscribed;
                await update(
                  () => store.setSubscribed(s.agent, s.sessionId, next),
                  (list) => list.map((x) => (x.agent === s.agent && x.sessionId === s.sessionId ? { ...x, subscribed: next } : x)),
                );
              }}
              onArchiveDone={async () => {
                let n = 0;
                await update(
                  async () => (n = await store.archiveDone(Date.now(), await activeSessions())),
                  (list) => list.filter((x) => x.status !== "done"),
                );
                await showHUD(t("hud.archived", { n }));
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
  t: Translator;
  config: Config;
  showDetail: boolean;
  onToggleDetail: () => void;
  onHandled: () => void;
  onToggleSubscribe: () => void;
  onArchiveDone: () => void;
  onRefresh: () => void;
}) {
  const { session: s, t, config, showDetail } = props;
  const cloud = isClaudeCloudOnly(s);
  const dot = statusDot(s);
  const accessories: List.Item.Accessory[] = [];
  if (dot) accessories.push({ icon: dot, tooltip: statusLabel(s, t) });
  if (cloud) accessories.push({ icon: Icon.Cloud, tooltip: t("host.cloud") });
  else if (!showDetail && (s.status === "ready" || s.status === "unknown")) accessories.push({ text: statusLabel(s, t) });
  if (!showDetail && (!cloud || s.updatedAt)) accessories.push({ text: rowTime(s, t) });

  return (
    <List.Item
      id={`${s.agent}:${s.sessionId}`}
      icon={agentIcon(s.agent, !s.subscribed)}
      title={s.title || s.sessionId}
      subtitle={showDetail ? undefined : [projectName(s.cwd), hostTag(s.host)].filter(Boolean).join(" · ")}
      keywords={[projectName(s.cwd), s.summary].filter(Boolean)}
      accessories={accessories}
      detail={<SessionDetail session={s} t={t} />}
      actions={
        <ActionPanel title={s.title}>
          <ActionPanel.Section>
            {/* Keep the same primary and secondary actions as All Sessions. */}
            <Action title={t("action.jump")} icon={Icon.ArrowNe} onAction={() => jumpBack(s, config, t)} />
            <Action
              title={s.subscribed ? t("action.unsubscribe") : t("action.subscribe")}
              icon={s.subscribed ? Icon.BellDisabled : Icon.Bell}
              onAction={props.onToggleSubscribe}
            />
            <Action
              title={t("action.handled")}
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={props.onHandled}
            />
            <Action
              title={showDetail ? t("action.hideDetail") : t("action.detail")}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={props.onToggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("action.archiveDone")}
              icon={Icon.Tray}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={props.onArchiveDone}
            />
            <Action
              title={t("action.refresh")}
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
function useConfirmJump(context: JumpContext | undefined, config: Config, t: Translator) {
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
        title: t("confirm.jumpTitle", { target: agentHostLabel(s.agent, s.host, t) }),
        message: s.title || s.sessionId,
        primaryAction: { title: t("action.jump"), style: Alert.ActionStyle.Default },
        dismissAction: { title: t("confirm.cancel") },
      });
      if (ok) await jumpBack(s, config, t);
    })();
  }, [context?.jump?.agent, context?.jump?.sessionId]);
}
