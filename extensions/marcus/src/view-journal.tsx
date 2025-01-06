import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getJournalEntries } from "./utils/storage";
import { JournalEntry } from "./types";

export default function Command() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const loadedEntries = await getJournalEntries();
    setEntries(loadedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsLoading(false);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <List isLoading={isLoading}>
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          title={formatDate(entry.date)}
          subtitle={entry.prompt}
          detail={
            <List.Item.Detail
              markdown={`## ${entry.prompt}\n\n${entry.content}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={formatDate(entry.date)} />
                  <List.Item.Detail.Metadata.Label title="Prompt" text={entry.prompt} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Entry"
                  content={`${formatDate(entry.date)}\n\n${entry.prompt}\n\n${entry.content}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="New Journal Entry"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => {
                    // Navigate to journal command
                    // Note: You might want to implement this navigation
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
