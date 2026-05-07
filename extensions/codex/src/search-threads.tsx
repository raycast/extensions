import { useMemo, useState, useCallback, useRef } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useSQL } from "@raycast/utils";
import {
  buildRunningMap,
  codexThreadUrl,
  fmtRelative,
  getRunningWindowSeconds,
  logsPath,
  RunningRow,
  runningThreadsQuery,
  shortCwd,
  shouldIncludeArchived,
  statePath,
  statusFor,
  Thread,
  ThreadStatus,
  threadsQuery,
} from "./lib/codex";

function statusAccessory(status: ThreadStatus): List.Item.Accessory[] {
  if (status === "in_progress") {
    return [
      {
        icon: { source: Icon.CircleProgress100, tintColor: Color.Orange },
        tooltip: "In progress",
      },
    ];
  }
  return [];
}

function titleOf(t: Thread): string {
  return (
    t.title?.trim() ||
    t.first_user_message?.split("\n")[0]?.trim() ||
    t.id.slice(0, 8)
  );
}

function searchHay(t: Thread): string {
  return (
    (t.title || "") +
    " " +
    (t.cwd || "") +
    " " +
    (t.git_branch || "") +
    " " +
    (t.model || "") +
    " " +
    (t.first_user_message || "")
  ).toLowerCase();
}

export default function Command() {
  const includeArchived = shouldIncludeArchived();
  const windowSec = getRunningWindowSeconds();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const onSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDebouncedSearch(text.trim().toLowerCase()),
      120,
    );
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const {
    data: threads,
    isLoading: threadsLoading,
    error: threadsError,
    revalidate,
  } = useSQL<Thread>(statePath(), threadsQuery(includeArchived));

  const { data: runningRows, error: runningError } = useSQL<RunningRow>(
    logsPath(),
    runningThreadsQuery(windowSec),
  );
  void runningError;

  const runningMap = useMemo(() => buildRunningMap(runningRows), [runningRows]);

  const filtered = useMemo(() => {
    const list = threads ?? [];
    const q = debouncedSearch;
    if (!q) return list;
    return list.filter((t) => searchHay(t).includes(q));
  }, [threads, debouncedSearch]);

  const sections = useMemo(() => {
    const active: Thread[] = [];
    const byCwd = new Map<string, Thread[]>();
    for (const t of filtered) {
      const status = statusFor(t, runningMap);
      if (status === "in_progress") active.push(t);
      const key = shortCwd(t.cwd) || "(no cwd)";
      const arr = byCwd.get(key) ?? [];
      arr.push(t);
      byCwd.set(key, arr);
    }
    const sorted = new Map(
      [...byCwd.entries()].sort(
        (a, b) => (b[1][0]?.updated_at ?? 0) - (a[1][0]?.updated_at ?? 0),
      ),
    );
    return { active, byCwd: sorted };
  }, [filtered, runningMap]);

  if (threadsError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to read Codex DB",
      message: String(threadsError),
    });
  }

  const onOpen = async (t: Thread) => {
    try {
      await open(codexThreadUrl(t.id));
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Codex",
        message: String(e),
      });
    }
  };

  const renderItem = (t: Thread, opts?: { showCwd?: boolean }) => {
    const status = statusFor(t, runningMap);
    const cwdLabel = shortCwd(t.cwd);
    const accessories: List.Item.Accessory[] = [];
    if (opts?.showCwd && cwdLabel) {
      accessories.push({ tag: cwdLabel, tooltip: t.cwd ?? cwdLabel });
    }
    if (t.updated_at) {
      accessories.push({ text: fmtRelative(t.updated_at) });
    }
    accessories.push(...statusAccessory(status));
    return (
      <List.Item
        key={t.id}
        icon={
          t.archived
            ? { source: Icon.Tray, tintColor: Color.SecondaryText }
            : { source: Icon.Terminal, tintColor: Color.PrimaryText }
        }
        title={titleOf(t)}
        subtitle={t.git_branch ?? undefined}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action
              title="Open in Codex"
              icon={Icon.AppWindow}
              onAction={() => onOpen(t)}
            />
            {t.rollout_path && (
              <Action.ShowInFinder
                title="Show Rollout Jsonl in Finder"
                path={t.rollout_path}
              />
            )}
            {t.rollout_path && (
              <Action.Open title="Open Rollout Jsonl" target={t.rollout_path} />
            )}
            <Action.CopyToClipboard
              title="Copy Thread Id"
              content={t.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Codex URL"
              content={codexThreadUrl(t.id)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            {t.cwd && (
              <Action.ShowInFinder
                title="Show Cwd in Finder"
                path={t.cwd}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={threadsLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder="Search by title, project, branch, model…"
    >
      {sections.active.length > 0 && (
        <List.Section title="Active" subtitle={`${sections.active.length}`}>
          {sections.active.map((t) => renderItem(t, { showCwd: true }))}
        </List.Section>
      )}
      {[...sections.byCwd.entries()].map(([cwd, items]) => (
        <List.Section key={cwd} title={cwd} subtitle={`${items.length}`}>
          {items.map((t) => renderItem(t))}
        </List.Section>
      ))}
      {!threadsLoading && filtered.length === 0 && (
        <List.EmptyView
          icon={Icon.Terminal}
          title={searchText ? "No matching threads" : "No Codex threads found"}
          description={
            searchText
              ? "Try a different query."
              : "Make sure Codex Desktop is installed and has been used at least once."
          }
        />
      )}
    </List>
  );
}
