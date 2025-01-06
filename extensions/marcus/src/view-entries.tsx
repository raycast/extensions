import { List, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Detail } from "@raycast/api";

interface JournalEntry {
  timestamp: string;
  content: string;
}

function EntryDetail({ entry }: { entry: JournalEntry }) {
  return (
    <Detail
      markdown={`# ${entry.timestamp}\n\n${entry.content}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Entry"
            content={`${entry.timestamp}\n${entry.content}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`data:text/plain;charset=utf-8,${encodeURIComponent(`${entry.timestamp}\n${entry.content}`)}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Date" text={new Date(entry.timestamp).toLocaleDateString()} />
          <Detail.Metadata.Label title="Time" text={new Date(entry.timestamp).toLocaleTimeString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Context">
            <Detail.Metadata.TagList.Item text="Journal" color={"#FF6363"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

export default function ViewEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    async function loadEntries() {
      try {
        const journalPath = join(homedir(), "journal.txt");
        const content = await readFile(journalPath, "utf-8");

        const entryRegex = /\[(.*?)\]\n([\s\S]*?)─{50}/g;
        const matches = Array.from(content.matchAll(entryRegex));

        const parsedEntries = matches
          .map((match) => ({
            timestamp: match[1],
            content: match[2].trim(),
          }))
          .reverse();

        setEntries(parsedEntries);
        await showToast({
          style: Toast.Style.Success,
          title: "Entries Loaded",
          message: `Found ${parsedEntries.length} journal entries`,
        });
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Entries",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchText.toLowerCase();
    return entry.content.toLowerCase().includes(searchLower) || entry.timestamp.toLowerCase().includes(searchLower);
  });

  const handleCopyToClipboard = async () => {
    try {
      await showToast({
        style: Toast.Style.Success,
        title: "Entry Copied",
        message: "Ready to paste elsewhere",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy",
        message: String(error),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your memories..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle="Journal Entries"
    >
      <List.Section title="Your Memories" subtitle={`${filteredEntries.length} entries`}>
        {filteredEntries.map((entry) => (
          <List.Item
            key={entry.timestamp}
            title={new Date(entry.timestamp).toLocaleDateString()}
            subtitle={`${entry.content.slice(0, 100)}${entry.content.length > 100 ? "..." : ""}`}
            accessories={[
              {
                text: new Date(entry.timestamp).toLocaleTimeString(),
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="View Entry" icon={Icon.Eye} onAction={() => push(<EntryDetail entry={entry} />)} />
                <Action.CopyToClipboard
                  title="Copy Entry"
                  content={`${entry.timestamp}\n${entry.content}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onCopy={handleCopyToClipboard}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`data:text/plain;charset=utf-8,${encodeURIComponent(`${entry.timestamp}\n${entry.content}`)}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
