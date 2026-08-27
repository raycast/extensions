import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  type LaunchProps,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkNumiInstallation, isNumiCliInstalled } from "./services/checkinstall";
import { isConnectionRefused, isNumiApiAvailable, runQuery } from "./services/requests";
import {
  HISTORY_STORAGE_KEY,
  type HistoryEntry,
  type HistoryUpdater,
  appendEntry,
  clearLegacyHistory,
  createHistoryWriter,
  parseMaxHistory,
  readLegacyHistory,
} from "./services/history";

const BACKEND_POLL_INTERVAL_MS = 5000;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * History waits considerably longer than the query does. Numi answers partial
 * input, so recording on the same cadence as the search would save a query
 * word by word as it is typed.
 */
const HISTORY_SETTLE_MS = 1200;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const { max_history_elemets, use_numi_cli } = getPreferenceValues<Preferences>();
  const maxHistory = parseMaxHistory(max_history_elemets);

  // The search bar is controlled so that launch arguments, fallback-command text
  // and "use this query" from history all flow through one source of truth.
  const [searchText, setSearchText] = useState(props.arguments.queryArgument ?? "");
  const debouncedQuery = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  const settledQuery = useDebouncedValue(searchText, HISTORY_SETTLE_MS);
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | undefined>(undefined);

  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, []);

  // Every history change goes through one serialized writer, so overlapping
  // mutations compose instead of overwriting each other. See createHistoryWriter.
  const writer = useRef(createHistoryWriter()).current;

  useEffect(() => {
    // Skipped while loading so the writer is never seeded with an empty array
    // while a stored history is still on its way in.
    if (!isHistoryLoading) writer.sync(history ?? []);
  }, [history, isHistoryLoading, writer]);

  const mutateHistory = useCallback(
    (updater: HistoryUpdater) => writer.mutate(updater, setHistory),
    [writer, setHistory],
  );

  const handleQueryError = useCallback(
    async (error: Error) => {
      if (isConnectionRefused(error)) {
        setIsBackendAvailable(false);
        return;
      }

      await showFailureToast(error, {
        title: use_numi_cli ? "Could not run numi-cli" : "Could not reach Numi",
      });
    },
    [use_numi_cli],
  );

  const { data: results, isLoading: isQuerying } = useCachedPromise(
    (expression: string, useNumiCli: boolean) => runQuery(expression, useNumiCli),
    [debouncedQuery, use_numi_cli],
    { initialData: [] as string[], keepPreviousData: true, onError: handleQueryError },
  );

  useEffect(() => {
    void checkNumiInstallation();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const available = use_numi_cli ? await isNumiCliInstalled() : await isNumiApiAvailable();
      if (!cancelled) setIsBackendAvailable(available);
    };

    void check();
    const interval = setInterval(() => void check(), BACKEND_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [use_numi_cli]);

  // One-time move of history off the evictable Cache and into LocalStorage.
  // Queued like every other mutation: this is the one moment real user data is
  // at stake, so it must not race a query being recorded on the same launch.
  const hasMigrated = useRef(false);
  useEffect(() => {
    if (isHistoryLoading || hasMigrated.current) return;
    hasMigrated.current = true;

    const legacy = readLegacyHistory();
    if (legacy.length === 0) return;

    void mutateHistory((current) => (current.length > 0 ? current : legacy.slice(-maxHistory))).then(
      clearLegacyHistory,
    );
  }, [isHistoryLoading, mutateHistory, maxHistory]);

  const recordQuery = useCallback(
    (entryQuery: string, entryResults: string[], supersedes: string | null) =>
      mutateHistory((current) =>
        appendEntry(
          current,
          { query: entryQuery, results: entryResults, timestamp: Date.now() },
          { max: maxHistory, supersedes },
        ),
      ),
    [mutateHistory, maxHistory],
  );

  const lastRecorded = useRef("");
  const lastRecordedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (isQuerying || isHistoryLoading) return;

    const expression = debouncedQuery.trim();
    // Nothing is saved until typing has fully stopped: while a query is still
    // being typed the settled value lags behind and the two differ.
    if (settledQuery.trim() !== expression) return;

    const result = results?.[0]?.trim();
    // Echoing the input back (e.g. plain text) is not a calculation worth saving.
    if (!expression || !result || result === expression) return;

    const signature = `${expression} => ${result}`;
    if (lastRecorded.current === signature) return;
    lastRecorded.current = signature;

    const supersedes = lastRecordedQuery.current;
    lastRecordedQuery.current = expression;
    void recordQuery(expression, results ?? [], supersedes);
  }, [debouncedQuery, settledQuery, results, isQuerying, isHistoryLoading, recordQuery]);

  const deleteEntry = useCallback(
    (entryQuery: string) => mutateHistory((current) => current.filter((entry) => entry.query !== entryQuery)),
    [mutateHistory],
  );

  const clearHistory = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear Query History",
      message: "This removes every saved query. It cannot be undone.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    // Queued rather than removing the key outright, so a query still being
    // recorded cannot land afterwards and resurrect the list.
    await mutateHistory(() => []);
    clearLegacyHistory();
    lastRecorded.current = "";
    lastRecordedQuery.current = null;
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, [mutateHistory]);

  const currentResults = (results ?? []).filter((result) => result.trim().length > 0);
  const historyEntries = [...(history ?? [])].reverse();

  return (
    <List
      searchBarPlaceholder="Enter text to query"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isQuerying || isHistoryLoading}
    >
      <List.EmptyView
        icon="empty-view.png"
        title={
          isBackendAvailable === false
            ? use_numi_cli
              ? "Numi CLI is not installed"
              : "Numi's API is not responding"
            : "Waiting for query..."
        }
        description={
          isBackendAvailable === false
            ? use_numi_cli
              ? "Run: brew install nikolaeu/numi/numi-cli"
              : "Recent Numi versions dropped this API. Install numi-cli and turn on “Use numi-cli” in preferences."
            : "E.g.: 1+5..."
        }
      />

      <List.Section title="Current">
        {currentResults.map((result) => (
          <List.Item
            key={result}
            title={result}
            icon={Icon.Text}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result} />
                <Action.Paste content={result} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="History">
        {historyEntries.map((entry) => (
          <List.Item
            key={entry.query}
            title={entry.query}
            icon={Icon.Clock}
            accessories={[
              { text: entry.results[0] },
              { date: new Date(entry.timestamp), tooltip: new Date(entry.timestamp).toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Use This Query"
                    icon={Icon.ArrowClockwise}
                    onAction={() => setSearchText(entry.query)}
                  />
                  <Action.CopyToClipboard content={entry.results[0]} />
                  <Action.Paste content={entry.results[0]} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Entry"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteEntry(entry.query)}
                  />
                  <Action
                    title="Clear History"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={clearHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
