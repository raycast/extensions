import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List, LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { addToHistory, HISTORY_KEYS, parseHistorySize } from "./history";
import { parsePrefixLength } from "./ip";

export const ALL_POOLS = "all";

interface Props {
  generate: (pool: string, length: number) => string;
  defaultLength: number;
  historyKey: string;
  length?: string;
  pools?: string[];
}

type Result = { prefix: string } | { error: string };

function attempt(generate: Props["generate"], pool: string, length: number | undefined): Result {
  if (length === undefined) return { error: "The prefix length must be a number, like 20 or /20" };
  try {
    return { prefix: generate(pool, length) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function useHistory(key: string, enabled: boolean, size: number, result: Result) {
  const [history, setHistory] = useState<string[]>();
  const recorded = useRef<Result>(undefined);

  useEffect(() => {
    if (enabled) {
      LocalStorage.getItem<string>(key).then((item) => setHistory(item ? JSON.parse(item) : []));
    } else {
      Object.values(HISTORY_KEYS).forEach((other) => LocalStorage.removeItem(other));
    }
  }, [key, enabled]);

  useEffect(() => {
    if (history) LocalStorage.setItem(key, JSON.stringify(history));
  }, [key, history]);

  const loaded = history !== undefined;
  useEffect(() => {
    if (!loaded || size === 0 || recorded.current === result) return;
    recorded.current = result;
    if ("prefix" in result) setHistory((current) => addToHistory(current ?? [], result.prefix, size));
  }, [loaded, size, result]);

  const current = "prefix" in result ? result.prefix : undefined;
  return {
    isLoading: size > 0 && !loaded,
    previous: size === 0 ? [] : (history ?? []).filter((entry) => entry !== current).slice(0, size),
    remove: (entry: string) => setHistory((entries) => entries?.filter((other) => other !== entry)),
    clear: () => setHistory(current === undefined ? [] : [current]),
  };
}

export function PrefixList({ generate, defaultLength, historyKey, length: text, pools }: Props) {
  const length = text?.trim() ? parsePrefixLength(text) : defaultLength;
  const preferences = getPreferenceValues<Preferences>();
  const size = parseHistorySize(preferences.history, preferences.historySize);
  const [pool, setPool] = useState(ALL_POOLS);
  const [result, setResult] = useState(() => attempt(generate, ALL_POOLS, length));
  const history = useHistory(historyKey, preferences.history, size, result);

  function selectPool(value: string) {
    if (value === pool) return;
    setPool(value);
    setResult(attempt(generate, value, length));
  }

  const generateAction = (
    <Action
      title="Generate New Prefix"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setResult(attempt(generate, pool, length))}
    />
  );

  return (
    <List
      isLoading={history.isLoading}
      searchBarAccessory={
        pools && (
          <List.Dropdown tooltip="Private Range" defaultValue={ALL_POOLS} onChange={selectPool}>
            <List.Dropdown.Item title="Include All Prefixes" value={ALL_POOLS} />
            {pools.map((value) => (
              <List.Dropdown.Item key={value} title={value} value={value} />
            ))}
          </List.Dropdown>
        )
      }
    >
      <List.Section title="New Prefix">
        {"prefix" in result ? (
          <List.Item
            title={result.prefix}
            icon={Icon.Network}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.prefix} />
                {generateAction}
              </ActionPanel>
            }
          />
        ) : (
          <List.Item title={result.error} icon={Icon.Warning} actions={<ActionPanel>{generateAction}</ActionPanel>} />
        )}
      </List.Section>
      <List.Section title="History">
        {history.previous.map((entry) => (
          <List.Item
            key={entry}
            title={entry}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={entry} />
                {generateAction}
                <Action
                  title="Remove Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => history.remove(entry)}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={history.clear}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
