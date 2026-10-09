import { Action, ActionPanel, getPreferenceValues, Icon, Image, Keyboard, List, LocalStorage } from "@raycast/api";
import { ReactNode, useEffect, useRef, useState } from "react";
import { addToHistory, HISTORY_KEYS, parseHistorySize } from "./history";

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
    if ("value" in result) setHistory((current) => addToHistory(current ?? [], result.value, size));
  }, [loaded, size, result]);

  const current = "value" in result ? result.value : undefined;
  return {
    isLoading: size > 0 && !loaded,
    previous: size === 0 ? [] : (history ?? []).filter((entry) => entry !== current).slice(0, size),
    remove: (entry: string) => setHistory((entries) => entries?.filter((other) => other !== entry)),
    clear: () => setHistory(current === undefined ? [] : [current]),
  };
}

export function ValueList({ generate, historyKey, noun, icon, extraActions }: Props) {
  const preferences = getPreferenceValues<Preferences>();
  const size = parseHistorySize(preferences.history, preferences.historySize);
  const [result, setResult] = useState(() => attempt(generate));
  const history = useHistory(historyKey, preferences.history, size, result);

  const generateAction = (
    <Action
      title={`Generate New ${noun}`}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setResult(attempt(generate))}
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
                <Action.CopyToClipboard content={result.value} />
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
        {history.previous.map((entry) => (
          <List.Item
            key={entry}
            title={entry}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={entry} />
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
