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
  clearLegacyHistory,
  parseMaxHistory,
  readLegacyHistory,
} from "./services/history";

const BACKEND_POLL_INTERVAL_MS = 5000;
const SEARCH_DEBOUNCE_MS = 200;

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
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | undefined>(undefined);

  const {
    value: history,
    setValue: setHistory,
    removeValue: removeHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, []);

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
  const hasMigrated = useRef(false);
  useEffect(() => {
    if (isHistoryLoading || hasMigrated.current) return;
    hasMigrated.current = true;

    if ((history ?? []).length > 0) {
      clearLegacyHistory();
      return;
    }

    const legacy = readLegacyHistory();
    if (legacy.length === 0) return;

    void setHistory(legacy.slice(-maxHistory)).then(clearLegacyHistory);
  }, [isHistoryLoading, history, setHistory, maxHistory]);

  const recordQuery = useCallback(
    async (entryQuery: string, entryResults: string[]) => {
      const withoutDuplicate = (history ?? []).filter((entry) => entry.query !== entryQuery);
      const next = [...withoutDuplicate, { query: entryQuery, results: entryResults, timestamp: Date.now() }];
      await setHistory(next.slice(-maxHistory));
    },
    [history, setHistory, maxHistory],
  );

  const lastRecorded = useRef("");
  useEffect(() => {
    if (isQuerying || isHistoryLoading) return;

    const expression = debouncedQuery.trim();
    const result = results?.[0]?.trim();
    // Echoing the input back (e.g. plain text) is not a calculation worth saving.
    if (!expression || !result || result === expression) return;

    const signature = `${expression} => ${result}`;
    if (lastRecorded.current === signature) return;
    lastRecorded.current = signature;

    void recordQuery(expression, results ?? []);
  }, [debouncedQuery, results, isQuerying, isHistoryLoading, recordQuery]);

  const deleteEntry = useCallback(
    async (entryQuery: string) => {
      await setHistory((history ?? []).filter((entry) => entry.query !== entryQuery));
    },
    [history, setHistory],
  );

  const clearHistory = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear Query History",
      message: "This removes every saved query. It cannot be undone.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await removeHistory();
    clearLegacyHistory();
    lastRecorded.current = "";
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, [removeHistory]);

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
