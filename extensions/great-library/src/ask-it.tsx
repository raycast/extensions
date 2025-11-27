import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { truncate } from "./lib/ask";
import { useAskQuestion, type QaEntry } from "./hooks/useAskQuestion";
import { copyEntryAnswer, copyEntryCitations, getEntryMarkdown } from "./utils/ui-helpers";

export default function AskItCommand() {
  const [searchText, setSearchText] = useState<string>("");
  const { entries, isLoading, ask, clearHistory } = useAskQuestion();

  // Handle ask action
  const handleAsk = async (input?: string) => {
    const question = (input ?? searchText).trim();
    if (!question) return;

    await ask(question);

    // Clear search text if we used an input
    if (input) {
      setSearchText("");
    }
  };

  // Compute placeholder detail based on latest entry
  const latestEntry = entries[0];
  const placeholderDetail = useMemo(() => {
    if (!latestEntry) {
      return "Type a question into the search bar above and press ⏎ to run it against your indexed documents.";
    }
    if (latestEntry.status === "pending") {
      return `Searching for:\n\n> ${latestEntry.question}`;
    }
    if (latestEntry.status === "error") {
      return `⚠️ ${latestEntry.error ?? "The last question failed."}`;
    }
    return `Latest answer:\n\n${latestEntry.answer ?? "No data yet."}`;
  }, [latestEntry]);

  return (
    <List
      searchBarPlaceholder="Ask anything about your documents..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail
      isLoading={isLoading}
      navigationTitle="Ask the Great Library"
    >
      <List.Section title="Prompt">
        <List.Item
          id="ask"
          icon={Icon.MagnifyingGlass}
          title={searchText.trim() || "Type your question"}
          subtitle={isLoading ? "Searching..." : "Press ⏎ to ask"}
          detail={<List.Item.Detail markdown={placeholderDetail} />}
          actions={
            <ActionPanel>
              <Action title="Ask Question" icon={Icon.MagnifyingGlass} onAction={() => handleAsk()} />
              {entries.length > 0 && (
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearHistory}
                />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      {entries.length > 0 && (
        <List.Section title="History">
          {entries.map((entry) => (
            <List.Item
              key={entry.id}
              id={entry.id}
              title={entry.question}
              accessories={[{ date: new Date(entry.createdAt) }]}
              icon={entry.status === "error" ? Icon.ExclamationMark : Icon.Document}
              subtitle={entry.status === "error" ? "Error" : undefined}
              detail={
                <List.Item.Detail markdown={getEntryMarkdown(entry)} metadata={<EntryMetadata entry={entry} />} />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Answer"
                    icon={Icon.Clipboard}
                    onAction={() => copyEntryAnswer(entry)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Copy Citations"
                    icon={Icon.Clipboard}
                    onAction={() => copyEntryCitations(entry.citations)}
                  />
                  <Action title="Ask Follow-Up" icon={Icon.Message} onAction={() => setSearchText("")} />
                  <Action
                    title="Ask Again"
                    icon={Icon.Repeat}
                    onAction={() => handleAsk(entry.question)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearHistory}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/**
 * Component for displaying entry metadata
 */
function EntryMetadata({ entry }: { entry: QaEntry }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Question" text={entry.question} />
      <List.Item.Detail.Metadata.Label title="Asked" text={new Date(entry.createdAt).toLocaleString()} />
      {entry.citations.length > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Citations" text="" />
          {entry.citations.map((citation) => (
            <List.Item.Detail.Metadata.Label
              key={citation.id}
              title={citation.documentName}
              text={truncate(citation.snippet)}
            />
          ))}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}
