import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { parseHistorySize } from "./history";
import { createHistoryStore } from "./history-store";
import { parsePrefixLength } from "./ip";

export const ALL_POOLS = "all";

const store = createHistoryStore(LocalStorage);

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

export function CopyAction(props: { content: string; title?: string; shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title={props.title ?? "Copy to Clipboard"}
      icon={Icon.Clipboard}
      shortcut={props.shortcut}
      onAction={async () => {
        await store.flush();
        await Clipboard.copy(props.content);
        await showHUD("Copied to Clipboard");
      }}
    />
  );
}

function useHistory(key: string, enabled: boolean, size: number) {
  const [entries, setEntries] = useState<string[]>();

  useEffect(() => {
    (enabled ? store.load(key) : store.deleteAll()).then(setEntries);
  }, [key, enabled]);

  function update(task: Promise<string[]>) {
    task.then(setEntries, () => undefined);
  }

  return {
    isLoading: entries === undefined,
    entries: size === 0 ? [] : (entries ?? []),
    record: (prefix: string) => size > 0 && update(store.record(key, prefix, size)),
    remove: (prefix: string) => update(store.remove(key, prefix)),
    clear: (keep?: string) => update(store.clear(key, keep)),
  };
}

export function PrefixList({ generate, defaultLength, historyKey, length: text, pools }: Props) {
  const length = text?.trim() ? parsePrefixLength(text) : defaultLength;
  const preferences = getPreferenceValues<Preferences>();
  const size = parseHistorySize(preferences.history, preferences.historySize);
  const [pool, setPool] = useState(ALL_POOLS);
  const [result, setResult] = useState(() => attempt(generate, ALL_POOLS, length));
  const history = useHistory(historyKey, preferences.history, size);

  function regenerate(nextPool: string) {
    const next = attempt(generate, nextPool, length);
    setResult(next);
    if ("prefix" in next) history.record(next.prefix);
  }

  function selectPool(value: string) {
    if (value === pool) return;
    setPool(value);
    regenerate(value);
  }

  useEffect(() => {
    if ("prefix" in result) history.record(result.prefix);
  }, []);

  const current = "prefix" in result ? result.prefix : undefined;
  const previous = history.entries.filter((entry) => entry !== current).slice(0, size);

  const generateAction = (
    <Action
      title="Generate New Prefix"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => regenerate(pool)}
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
                <CopyAction content={result.prefix} />
                {generateAction}
              </ActionPanel>
            }
          />
        ) : (
          <List.Item title={result.error} icon={Icon.Warning} actions={<ActionPanel>{generateAction}</ActionPanel>} />
        )}
      </List.Section>
      <List.Section title="History">
        {previous.map((entry) => (
          <List.Item
            key={entry}
            title={entry}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <CopyAction content={entry} />
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
                  onAction={() => history.clear(current)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
