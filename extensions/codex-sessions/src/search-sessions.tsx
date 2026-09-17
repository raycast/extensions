import * as React from "react";
import { access } from "node:fs/promises";
import { basename } from "node:path";
import { Action, ActionPanel, Color, Icon, List, showInFinder, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  isCodexDesktopInstalled,
  openThread,
  openWorkspace,
  openWorkspaceViaCli,
  showFailureToast,
  threadDeepLink,
} from "./lib/open-codex";
import { resolveCodexBinary } from "./lib/codex-paths";
import { loadThreads, normalizeTimestamp, threadTitle, type ThreadMode, type ThreadRow } from "./lib/threads";
import { buildResumeCommand, openInTerminal } from "./lib/terminal";
import { loadSessionStates, markSessionSeen, type SessionState, type SessionStateMap } from "./lib/session-status";

type SessionScope = "Interactive" | "Working" | "Unread Completed" | "All" | "Archived";

const scopes: SessionScope[] = ["Interactive", "Working", "Unread Completed", "All", "Archived"];
const scopeTitles: Record<SessionScope, string> = {
  Interactive: "Interactive",
  Working: "Working",
  "Unread Completed": "Unread Completed",
  All: "All (incl. automation)",
  Archived: "Archived",
};

function databaseMode(scope: SessionScope): ThreadMode {
  return scope === "Archived" ? "Archived" : scope === "All" ? "All" : "Interactive";
}

type TimeBucket = "Today" | "Yesterday" | "This Week" | "Older";

const bucketOrder: TimeBucket[] = ["Today", "Yesterday", "This Week", "Older"];

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getTimeBucket(timestamp: number, now = new Date()): TimeBucket {
  const date = new Date(normalizeTimestamp(timestamp));
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monday = new Date(today);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= monday) return "This Week";
  return "Older";
}

function bucketRows(rows: ThreadRow[]): Record<TimeBucket, ThreadRow[]> {
  const buckets: Record<TimeBucket, ThreadRow[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };
  for (const row of rows) buckets[getTimeBucket(row.updated_at)].push(row);
  return buckets;
}

function sourceLabel(source: string): string {
  if (!source) return "unknown";
  if (source.startsWith("{")) return "automation";
  return source;
}

function sourceIcon(source: string): Icon {
  const normalized = source.toLocaleLowerCase();
  if (normalized === "cli" || normalized === "exec") return Icon.Terminal;
  if (normalized === "vscode") return Icon.Code;
  if (normalized === "desktop" || normalized === "codex") return Icon.AppWindow;
  if (source.startsWith("{")) return Icon.Gear;
  return Icon.Message;
}

function sessionStateFor(states: SessionStateMap, row: ThreadRow): SessionState | undefined {
  const state = states[row.id];
  if (!state) return undefined;
  if (state.status === "working" && Date.now() - Date.parse(state.updatedAt) > 24 * 60 * 60 * 1000) return undefined;
  return state;
}

function stateAccessory(state: SessionState | undefined): { tag: { value: string; color: Color } } | undefined {
  if (!state) return undefined;
  if (state.status === "working") return { tag: { value: "Working", color: Color.Orange } };
  if (state.unread) return { tag: { value: "Done · Unread", color: Color.Green } };
  return { tag: { value: "Done", color: Color.SecondaryText } };
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatTokens(tokens: number): string {
  return tokens > 0 ? tokens.toLocaleString() : "—";
}

async function runAction(action: () => Promise<unknown>, title: string, message: string): Promise<void> {
  try {
    await action();
  } catch {
    await showFailureToast(title, message);
  }
}

function SessionDetail({ row }: { row: ThreadRow }) {
  return (
    <List.Item.Detail
      markdown={row.first_user_message || "No user message recorded."}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="cwd" text={displayValue(row.cwd)} />
          <List.Item.Detail.Metadata.Label title="Branch" text={displayValue(row.git_branch)} />
          <List.Item.Detail.Metadata.Label title="Model" text={displayValue(row.model)} />
          <List.Item.Detail.Metadata.Label title="Tokens" text={formatTokens(row.tokens_used)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={new Date(row.created_at).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Updated" text={new Date(row.updated_at).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Source" text={sourceLabel(row.source)} />
          <List.Item.Detail.Metadata.Label title="Thread ID" text={row.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface SessionItemProps {
  row: ThreadRow;
  scope: SessionScope;
  state: SessionState | undefined;
  isShowingDetail: boolean;
  desktopInstalled: boolean | undefined;
  codexBinary: string | null;
  rolloutExists: boolean;
  onToggleDetail: () => void;
  onRefresh: () => Promise<unknown>;
  onStateRefresh: () => Promise<unknown>;
}

function SessionItem({
  row,
  scope,
  state,
  isShowingDetail,
  desktopInstalled,
  codexBinary,
  rolloutExists,
  onToggleDetail,
  onRefresh,
  onStateRefresh,
}: SessionItemProps) {
  const cwdName = row.cwd ? basename(row.cwd) : "";
  const resumeCommand = buildResumeCommand(codexBinary || "codex", row.cwd || undefined, row.id);
  const deepLink = threadDeepLink(row.id);
  const markOpened = async (opened: boolean) => {
    if (opened) {
      await markSessionSeen(row.id);
      await onStateRefresh();
    }
  };
  // Three desktop states. false → no desktop action at all: Resume in Terminal
  // (rendered right after) becomes the primary, thread-preserving action for
  // CLI-only users. undefined (check pending) → a neutral session action that
  // resolves availability at action time. true → the Desktop deep link.
  const desktopAction =
    desktopInstalled === false ? null : desktopInstalled === undefined ? (
      <Action
        title="Open Session"
        icon={Icon.AppWindow}
        onAction={() =>
          void runAction(
            async () =>
              markOpened(
                (await isCodexDesktopInstalled())
                  ? await openThread(row.id)
                  : await openInTerminal(row.cwd || undefined, row.id),
              ),
            "Could not open the session",
            "Use Resume in Terminal or Copy Resume Command.",
          )
        }
      />
    ) : (
      <Action
        title={scope === "Archived" ? "Open in Codex Desktop (Archived — May Not Load)" : "Open in Codex Desktop"}
        icon={Icon.AppWindow}
        onAction={() =>
          void runAction(
            async () => markOpened(await openThread(row.id)),
            "Could not open the session",
            "Use Resume in Terminal or Copy Resume Command.",
          )
        }
      />
    );
  // A successful terminal resume opens the session, so it clears the unread
  // tag exactly like the Desktop path.
  const resumeAction = (
    <Action
      title="Resume in Terminal"
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      icon={Icon.Terminal}
      onAction={() =>
        void runAction(
          async () => markOpened(await openInTerminal(row.cwd || undefined, row.id)),
          "Could not resume the session",
          "Use Copy Resume Command to run the session manually.",
        )
      }
    />
  );
  const copyActions = (
    <>
      <Action.CopyToClipboard
        title="Copy Resume Command"
        content={resumeCommand}
        shortcut={Keyboard.Shortcut.Common.Copy}
        icon={Icon.Terminal}
      />
      <Action.CopyToClipboard
        title="Copy Thread ID"
        content={row.id}
        shortcut={Keyboard.Shortcut.Common.Pin}
        icon={Icon.CopyClipboard}
      />
      <Action.CopyToClipboard title="Copy Deep Link" content={deepLink} icon={Icon.Link} />
    </>
  );

  return (
    <List.Item
      id={row.id}
      title={threadTitle(row)}
      subtitle={cwdName || undefined}
      keywords={[cwdName, row.cwd, row.git_branch || "", row.id, row.first_user_message.slice(0, 200)].filter(Boolean)}
      accessories={[stateAccessory(state), { date: new Date(row.updated_at) }, { tag: sourceLabel(row.source) }].filter(
        (accessory): accessory is NonNullable<typeof accessory> => accessory !== undefined,
      )}
      icon={sourceIcon(row.source)}
      detail={<SessionDetail row={row} />}
      actions={
        <ActionPanel>
          {scope === "Archived" ? (
            <>
              {resumeAction}
              {copyActions}
              {desktopAction}
            </>
          ) : (
            <>
              {desktopAction}
              {resumeAction}
              {copyActions}
            </>
          )}
          {row.cwd && desktopInstalled !== undefined ? (
            <Action
              title={desktopInstalled ? "Open Project in Codex Desktop" : "Open Project Via Codex CLI"}
              shortcut={Keyboard.Shortcut.Common.Open}
              icon={desktopInstalled ? Icon.Folder : Icon.Terminal}
              onAction={() =>
                void runAction(
                  () => (desktopInstalled ? openWorkspace(row.cwd) : openWorkspaceViaCli(row.cwd)),
                  "Could not open the project",
                  desktopInstalled
                    ? "Check that Codex Desktop is installed or use Resume in Terminal."
                    : "Set Codex CLI Path in extension preferences and try again.",
                )
              }
            />
          ) : null}
          {rolloutExists ? (
            <Action
              title="Show Rollout in Finder"
              icon={Icon.Document}
              onAction={() =>
                void runAction(
                  () => showInFinder(row.rollout_path),
                  "Could not show the rollout",
                  "The rollout file may have been moved or deleted.",
                )
              }
            />
          ) : null}
          {state?.status === "done" && state.unread ? (
            <Action
              title="Mark Completion as Seen"
              icon={Icon.Checkmark}
              onAction={() =>
                void runAction(
                  async () => {
                    await markSessionSeen(row.id);
                    await onStateRefresh();
                  },
                  "Could not mark completion as seen",
                  "Try refreshing the session list.",
                )
              }
            />
          ) : null}
          {row.cwd ? (
            <Action
              title="Open Project Folder in Finder"
              icon={Icon.Finder}
              onAction={() =>
                void runAction(
                  () => showInFinder(row.cwd),
                  "Could not open the project folder",
                  "The project folder may have been moved or deleted.",
                )
              }
            />
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={() => void runAction(onRefresh, "Could not refresh sessions", "Try reopening the command.")}
          />
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}

function EmptyState({ scope, degraded }: { scope: SessionScope; degraded: boolean }) {
  const mode = databaseMode(scope);
  if (degraded && scope === "Archived") {
    return (
      <List.EmptyView
        icon={Icon.Box}
        title="Archived sessions require the state database"
        description="The state DB is unavailable, so archived sessions cannot be loaded from rollout files."
      />
    );
  }
  if (scope === "Working") {
    return (
      <List.EmptyView
        icon={Icon.Clock}
        title="No working sessions found"
        description="Sessions currently processing will appear here."
      />
    );
  }
  if (scope === "Unread Completed") {
    return (
      <List.EmptyView
        icon={Icon.Checkmark}
        title="No unread completions"
        description="Completed sessions you have not opened yet will appear here."
      />
    );
  }
  if (mode === "Interactive") {
    return (
      <List.EmptyView
        icon={Icon.LineChart}
        title="No interactive sessions found"
        description="Interactive mode hides archived and automation sessions. Choose All (incl. automation) from the dropdown to search every local session."
      />
    );
  }
  return <List.EmptyView icon={Icon.MagnifyingGlass} title="No sessions found" description="Try a different search." />;
}

export default function SearchSessions() {
  const [scope, setScope] = React.useState<SessionScope>("Interactive");
  const [searchText, setSearchText] = React.useState("");
  const [isShowingDetail, setIsShowingDetail] = React.useState(false);
  const [rolloutPaths, setRolloutPaths] = React.useState<Set<string>>(new Set());
  const mode = databaseMode(scope);
  const databaseSearch = mode === "Interactive" ? "" : searchText;
  const { data, isLoading, revalidate } = useCachedPromise(loadThreads, [mode, databaseSearch], {
    keepPreviousData: true,
  });
  const { data: sessionStates, revalidate: revalidateStates } = useCachedPromise(loadSessionStates, [], {
    keepPreviousData: true,
  });
  const { data: desktopInstalledData } = useCachedPromise(isCodexDesktopInstalled, [], { keepPreviousData: true });
  const { data: codexBinary } = useCachedPromise(resolveCodexBinary, [], { keepPreviousData: true });
  const states: SessionStateMap = sessionStates || {};
  const loadedRows = data?.rows || [];
  const rows = React.useMemo(() => {
    if (scope === "Working") return loadedRows.filter((row) => sessionStateFor(states, row)?.status === "working");
    if (scope === "Unread Completed") {
      return loadedRows.filter((row) => {
        const state = sessionStateFor(states, row);
        return state?.status === "done" && state.unread;
      });
    }
    return loadedRows;
  }, [loadedRows, scope, states]);
  const degraded = data?.degraded === true;
  // Tri-state on purpose: undefined means the installed check is still pending.
  const desktopInstalled = desktopInstalledData;
  const buckets = React.useMemo(() => bucketRows(rows), [rows]);
  const atSearchCap = mode !== "Interactive" && searchText.trim().length > 0 && rows.length >= 200;

  React.useEffect(() => {
    const interval = setInterval(() => void revalidateStates(), 2000);
    return () => clearInterval(interval);
  }, [revalidateStates]);

  React.useEffect(() => {
    let cancelled = false;
    const paths = rows.map((row) => row.rollout_path).filter(Boolean);
    void Promise.all(
      paths.map(async (path) => {
        try {
          await access(path);
          return path;
        } catch {
          return null;
        }
      }),
    ).then((existing) => {
      if (!cancelled) setRolloutPaths(new Set(existing.filter((path): path is string => path !== null)));
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const onScopeChange = (value: string) => {
    const nextScope = value as SessionScope;
    if (!scopes.includes(nextScope)) return;
    setScope(nextScope);
    setSearchText("");
    setIsShowingDetail(false);
  };

  const listChildren = (
    <>
      {degraded ? (
        <List.Section title="State DB unavailable" subtitle="Showing the newest sessions from files">
          <List.Item
            id="degraded-state-db"
            title="state DB unavailable — showing newest sessions from files"
            icon={Icon.Warning}
            accessories={[{ tag: { value: "Degraded mode", color: Color.Orange } }]}
          />
        </List.Section>
      ) : null}
      {mode === "Interactive"
        ? bucketOrder.map((bucket) =>
            buckets[bucket].length > 0 ? (
              <List.Section key={bucket} title={bucket}>
                {buckets[bucket].map((row) => (
                  <SessionItem
                    key={row.id}
                    row={row}
                    scope={scope}
                    state={sessionStateFor(states, row)}
                    isShowingDetail={isShowingDetail}
                    desktopInstalled={desktopInstalled}
                    codexBinary={codexBinary || null}
                    rolloutExists={rolloutPaths.has(row.rollout_path)}
                    onToggleDetail={() => setIsShowingDetail((current) => !current)}
                    onRefresh={() => Promise.resolve(revalidate())}
                    onStateRefresh={() => Promise.resolve(revalidateStates())}
                  />
                ))}
              </List.Section>
            ) : null,
          )
        : rows.length > 0
          ? [
              <List.Section
                key="sessions"
                title={scopeTitles[scope]}
                subtitle={
                  atSearchCap ? "Showing first 200 matches — refine your search for more specific results." : undefined
                }
              >
                {rows.map((row) => (
                  <SessionItem
                    key={row.id}
                    row={row}
                    scope={scope}
                    state={sessionStateFor(states, row)}
                    isShowingDetail={isShowingDetail}
                    desktopInstalled={desktopInstalled}
                    codexBinary={codexBinary || null}
                    rolloutExists={rolloutPaths.has(row.rollout_path)}
                    onToggleDetail={() => setIsShowingDetail((current) => !current)}
                    onRefresh={() => Promise.resolve(revalidate())}
                    onStateRefresh={() => Promise.resolve(revalidateStates())}
                  />
                ))}
              </List.Section>,
            ]
          : null}
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      filtering={mode === "Interactive" ? { keepSectionOrder: true } : false}
      throttle={mode !== "Interactive"}
      onSearchTextChange={mode !== "Interactive" ? setSearchText : undefined}
      searchBarAccessory={
        <List.Dropdown tooltip="Session scope" value={scope} onChange={onScopeChange} storeValue>
          {scopes.map((value) => (
            <List.Dropdown.Item key={value} title={scopeTitles[value]} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {listChildren}
      {rows.length === 0 ? <EmptyState scope={scope} degraded={degraded} /> : null}
    </List>
  );
}
