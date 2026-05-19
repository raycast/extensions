import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { HistoryEntry, clearHistory, loadHistory, removeHistoryEntry } from "./history-store";
import { speakText } from "./tts";

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[]>();

  useEffect(() => {
    void loadHistory().then(setEntries);
  }, []);

  async function handleRemove(id: string) {
    const next = await removeHistoryEntry(id);
    setEntries(next);
    await showToast({ style: Toast.Style.Success, title: "Removed" });
  }

  async function handleClear() {
    await clearHistory();
    setEntries([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  const isLoading = entries === undefined;

  return (
    <List isLoading={isLoading} isShowingDetail={!isLoading && entries.length > 0} navigationTitle="History">
      <List.EmptyView
        icon={Icon.Clock}
        title={isLoading ? "Loading history..." : "No history yet"}
        description="Translations and rewrites you copy or paste are saved here."
      />
      {(entries ?? []).map((entry) => (
        <List.Item
          key={entry.id}
          icon={{
            source: entry.kind === "rewrite" ? Icon.Wand : Icon.Globe,
            tintColor: entry.kind === "rewrite" ? Color.Purple : Color.Blue,
          }}
          title={preview(entry.source)}
          subtitle={preview(entry.output)}
          accessories={[{ text: entry.model ?? entry.provider ?? entry.kind }, { date: new Date(entry.createdAt) }]}
          detail={<List.Item.Detail markdown={detailMarkdown(entry)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste content={entry.output} title="Paste Output" />
                <Action.CopyToClipboard content={entry.output} title="Copy Output" />
                <Action.CopyToClipboard
                  content={entry.source}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  title="Copy Source"
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Read Aloud">
                <Action
                  icon={Icon.SpeakerOn}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  title="Read Output Aloud"
                  onAction={() => void speakText(entry.output)}
                />
                <Action
                  icon={Icon.SpeakerOn}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                  title="Read Output Slowly"
                  onAction={() => void speakText(entry.output, { slow: true })}
                />
                <Action
                  icon={Icon.SpeakerOn}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  title="Read Source Aloud"
                  onAction={() => void speakText(entry.source)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Manage">
                <Action
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  style={Action.Style.Destructive}
                  title="Remove Entry"
                  onAction={() => void handleRemove(entry.id)}
                />
                <Action
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  style={Action.Style.Destructive}
                  title="Clear History"
                  onAction={() => void handleClear()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function detailMarkdown(entry: HistoryEntry): string {
  const meta = [entry.kind === "rewrite" ? "Rewrite" : "Translate", entry.model ?? entry.provider]
    .filter(Boolean)
    .join(" · ");
  return [`**${meta}**`, "", "## Output", "", entry.output, "", "---", "", "**Source**", "", quoted(entry.source)].join(
    "\n",
  );
}

function preview(text: string): string {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > 80 ? `${single.slice(0, 80)}...` : single;
}

function quoted(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}
