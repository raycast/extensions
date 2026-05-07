import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  getRunningWindowSeconds,
  logsPath,
  RunningRow,
  runningThreadsQuery,
  statePath,
  statusFor,
  Thread,
  ThreadStatus,
  threadsQuery,
} from "./lib/codex";

function titleOf(t: Thread): string {
  return (
    t.title?.trim() ||
    t.first_user_message?.split("\n")[0]?.trim() ||
    t.id.slice(0, 8)
  );
}

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

export default function Command() {
  const windowSec = getRunningWindowSeconds();
  const [tick, setTick] = useState(0);
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

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const threadsSql = `${threadsQuery(false)} -- t${tick}`;
  const runningSql = `${runningThreadsQuery(windowSec)} -- t${tick}`;

  const {
    data: threads,
    isLoading: threadsLoading,
    error: threadsError,
  } = useSQL<Thread>(statePath(), threadsSql);

  const { data: runningRows, error: runningError } = useSQL<RunningRow>(
    logsPath(),
    runningSql,
  );
  void runningError;

  const runningMap = useMemo(() => buildRunningMap(runningRows), [runningRows]);

  if (threadsError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to read Codex DB",
      message: String(threadsError),
    });
  }

  const activeThreads = useMemo(() => {
    const list = (threads ?? []).filter(
      (t) => statusFor(t, runningMap) === "in_progress",
    );
    const q = debouncedSearch;
    if (!q) return list;
    return list.filter((t) => titleOf(t).toLowerCase().includes(q));
  }, [threads, runningMap, debouncedSearch]);

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

  return (
    <List
      isLoading={threadsLoading && !threads}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={`Threads with activity in the last ${windowSec}s…`}
    >
      {activeThreads.length === 0 && !threadsLoading && (
        <List.EmptyView
          icon={{ source: Icon.Pause, tintColor: Color.SecondaryText }}
          title="No active Codex threads"
          description={`Nothing has logged in the last ${windowSec}s. This view auto-refreshes.`}
        />
      )}
      {activeThreads.map((t) => {
        const status = statusFor(t, runningMap);
        return (
          <List.Item
            key={t.id}
            icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            title={titleOf(t)}
            accessories={statusAccessory(status)}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Codex"
                  icon={Icon.AppWindow}
                  onAction={() => onOpen(t)}
                />
                <Action.CopyToClipboard title="Copy Thread Id" content={t.id} />
                {t.rollout_path && (
                  <Action.Open
                    title="Open Rollout Jsonl"
                    target={t.rollout_path}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
