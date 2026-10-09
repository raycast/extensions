import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  LocalStorage,
  showHUD,
} from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";
import { parseHistorySize } from "./history";
import { createHistoryStore } from "./history-store";

const store = createHistoryStore(LocalStorage);

interface Props {
  generate: () => string;
  historyKey: string;
  noun: string;
  icon: Image.ImageLike;
  extraActions?: (value: string) => ReactNode;
}

type Result = { value: string } | { error: string };

function attempt(generate: Props["generate"]): Result {
  try {
    return { value: generate() };
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
    record: (value: string) => size > 0 && update(store.record(key, value, size)),
    remove: (value: string) => update(store.remove(key, value)),
    clear: (keep?: string) => update(store.clear(key, keep)),
  };
}

export function ValueList({ generate, historyKey, noun, icon, extraActions }: Props) {
  const preferences = getPreferenceValues<Preferences>();
  const size = parseHistorySize(preferences.history, preferences.historySize);
  const [result, setResult] = useState(() => attempt(generate));
  const history = useHistory(historyKey, preferences.history, size);

  function regenerate() {
    const next = attempt(generate);
    setResult(next);
    if ("value" in next) history.record(next.value);
  }

  useEffect(() => {
    if ("value" in result) history.record(result.value);
  }, []);

  const current = "value" in result ? result.value : undefined;
  const previous = history.entries.filter((entry) => entry !== current).slice(0, size);

  const generateAction = (
    <Action
      title={`Generate New ${noun}`}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={regenerate}
    />
  );

  return (
    <List isLoading={history.isLoading}>
      <List.Section title={`New ${noun}`}>
        {"value" in result ? (
          <List.Item
            title={result.value}
            icon={icon}
            actions={
              <ActionPanel>
                <CopyAction content={result.value} />
                {extraActions?.(result.value)}
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
                {extraActions?.(entry)}
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
