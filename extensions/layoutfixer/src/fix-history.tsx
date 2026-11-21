import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { clearHistory, getHistory, HistoryEntry, removeHistory } from "./lib/storage";

const KIND_LABEL: Record<HistoryEntry["kind"], string> = {
  layout: "Layout",
  spelling: "Spelling",
  cleanup: "Clean-up",
  finglish: "Finglish",
  ai: "AI",
};

export default function Command() {
  const enabled = getPreferenceValues<Preferences>().history;
  const [entries, setEntries] = useState<HistoryEntry[]>();

  const reload = () => getHistory().then(setEntries);
  useEffect(() => {
    reload();
  }, []);

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear the fix history?",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await clearHistory();
      await reload();
    }
  }

  return (
    <List isLoading={!entries} isShowingDetail={!!entries?.length}>
      <List.EmptyView
        icon={Icon.Clock}
        title={enabled ? "No fixes yet" : "History is turned off"}
        description={
          enabled ? "Fixes you make will show up here." : "Turn on “Keep a history of fixes” in the settings."
        }
        actions={
          enabled ? undefined : (
            <ActionPanel>
              <Action title="Open Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          )
        }
      />
      {entries?.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.fixed.trim().replace(/\s+/g, " ")}
          accessories={[{ tag: KIND_LABEL[entry.kind] }, { date: new Date(entry.date) }]}
          detail={<List.Item.Detail markdown={`${entry.fixed}\n\n---\n\n**Before**\n\n${entry.original}`} />}
          actions={
            <ActionPanel>
              <Action.Paste title="Paste Fixed Text" content={entry.fixed} />
              <Action.CopyToClipboard title="Copy Fixed Text" content={entry.fixed} />
              <Action.CopyToClipboard
                title="Copy Original Text"
                content={entry.original}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await removeHistory(entry.id);
                    await reload();
                  }}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={clearAll}
                />
                <Action title="Open Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
