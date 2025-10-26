import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getHistory } from "./storage";
import { LookupView } from "./lookup";
import type { HistoryItem, Preferences } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  if (!apiKey) {
    showToast(Toast.Style.Failure, "API Key is required", "Set it in the extension preferences");
    openExtensionPreferences();
    throw new Error("API Key is missing");
  }

  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      setHistory(await getHistory());
    };
    fetchHistory();
  }, []);

  return (
    <List searchBarPlaceholder="History">
      {history.length > 0 ? (
        <List.Section title="Translation History" subtitle={history.length.toString()}>
          {history.map((item, i) => (
            <List.Item
              key={i}
              title={item.query}
              subtitle={`${item.from} → ${item.to} • ${new Date(item.date).toLocaleString()}`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Search This Again"
                    target={<LookupView query={item.query} from={item.from} to={item.to} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No history yet" description="Your past translations will appear here" />
      )}
    </List>
  );
}
