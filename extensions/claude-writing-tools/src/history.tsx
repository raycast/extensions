import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Chat } from "./components/Chat";
import { clearHistory, HistoryEntry, loadHistory, removeHistory } from "./lib/history";
import { formatUsd, modelLabel } from "./lib/models";
import { blockquote, oneLine, truncate } from "./lib/text";

const KINDS: Record<string, { title: string; icon: Icon }> = {
  "translate-replace": { title: "Translation", icon: Icon.Globe },
  "translate-to": { title: "Translation to Language", icon: Icon.Globe },
  "fix-grammar": { title: "Spelling and Grammar", icon: Icon.CheckCircle },
  "improve-writing": { title: "Improvement", icon: Icon.Stars },
  "change-tone": { title: "Tone", icon: Icon.SpeechBubble },
  transform: { title: "Instruction", icon: Icon.Wand },
  "ai-commands": { title: "AI Command", icon: Icon.Bolt },
  "screen-text": { title: "Screen Text", icon: Icon.Camera },
};

function daySection(createdAt: number): string {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (createdAt >= startOfToday) return "Today";
  if (createdAt >= startOfToday - 86_400_000) return "Yesterday";
  return new Date(createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function detailMarkdown(entry: HistoryEntry): string {
  return `${truncate(entry.output, 8000)}\n\n---\n\n**Original**\n\n${blockquote(truncate(entry.input, 8000))}`;
}

export default function Command() {
  const [kind, setKind] = useState("all");
  const { data = [], isLoading, revalidate } = usePromise(loadHistory);
  const entries = kind === "all" ? data : data.filter((entry) => entry.command === kind);

  const sections = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = daySection(entry.createdAt);
    sections.set(key, [...(sections.get(key) ?? []), entry]);
  }

  async function remove(entry: HistoryEntry) {
    await removeHistory(entry.id);
    revalidate();
  }

  async function removeAll() {
    const ok = await confirmAlert({
      title: "Clear History?",
      message: `${data.length} entries will be permanently deleted.`,
      primaryAction: { title: "Temizle", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await clearHistory();
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={entries.length > 0}
      searchBarPlaceholder="Search history…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={setKind}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          {Object.entries(KINDS).map(([value, { title, icon }]) => (
            <List.Dropdown.Item key={value} title={title} value={value} icon={icon} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Clock}
        title="No history yet"
        description="Originals and results of your translations, fixes and AI commands are kept here."
      />
      {[...sections.entries()].map(([title, items]) => (
        <List.Section key={title} title={title}>
          {items.map((entry) => (
            <List.Item
              key={entry.id}
              icon={KINDS[entry.command]?.icon ?? Icon.Text}
              title={oneLine(entry.output, 80) || "(empty)"}
              keywords={[entry.title, ...oneLine(entry.input, 200).split(" ")]}
              accessories={[{ date: new Date(entry.createdAt) }]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(entry)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Action"
                        text={entry.title}
                        icon={KINDS[entry.command]?.icon}
                      />
                      <List.Item.Detail.Metadata.Label title="Model" text={modelLabel(entry.model)} />
                      <List.Item.Detail.Metadata.Label title="Cost" text={formatUsd(entry.cost)} />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={new Date(entry.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Paste title="Paste Result" content={entry.output} />
                    <Action.CopyToClipboard title="Copy Result" content={entry.output} />
                    <Action.Paste
                      title="Paste Original"
                      icon={Icon.Undo}
                      content={entry.input}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Original"
                      content={entry.input}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Continue in Chat"
                      icon={Icon.Bubble}
                      shortcut={{ modifiers: ["cmd"], key: "j" }}
                      target={
                        <Chat
                          navigationTitle="Follow-Up"
                          seed={{
                            attachments: [
                              {
                                kind: "selection",
                                source: "selection",
                                text: `Original text:\n${entry.input}\n\nResult of “${entry.title}”:\n${entry.output}`,
                              },
                            ],
                            placeholder: "Ask about this result…",
                          }}
                        />
                      }
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => void remove(entry)}
                    />
                    <Action
                      title="Clear History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={() => void removeAll()}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
