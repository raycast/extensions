import { Action, ActionPanel, Detail, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { type HistoryEntry, loadHistory, saveHistory } from "./lib/history";

function DebugView({ entry }: { entry: HistoryEntry }) {
  const { pop } = useNavigation();
  const rawText = entry.rawText ?? "_Not available — re-run the analysis to capture debug data._";
  const rawResponse = entry.rawResponse ?? "_Not available — re-run the analysis to capture debug data._";

  const md = [
    `## Debug: ${entry.headline}`,
    `_${new Date(entry.timestamp).toLocaleString()} · ${entry.wordCount.toLocaleString()} words_`,
    "",
    "### Input Text (plain, after stripping)",
    "```",
    rawText,
    "```",
    "",
    "### Pangram API Response (raw JSON)",
    "```json",
    rawResponse,
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Back to History" onAction={pop} />
          {entry.rawText && <Action.CopyToClipboard title="Copy Input Text" content={entry.rawText} />}
          {entry.rawResponse && (
            <Action.CopyToClipboard
              title="Copy Raw JSON"
              content={entry.rawResponse}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function HistoryCommand() {
  const { push } = useNavigation();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory().then((h) => {
      setEntries(h);
      setIsLoading(false);
    });
  }, []);

  async function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await saveHistory(updated);
  }

  async function clearAll() {
    setEntries([]);
    await saveHistory([]);
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search history…">
      {entries.length === 0 && !isLoading && (
        <List.EmptyView title="No History" description="Run 'Detect AI Content' to start building history." />
      )}
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.headline}
          subtitle={`${entry.wordCount.toLocaleString()} words`}
          accessories={[{ date: new Date(entry.timestamp), tooltip: new Date(entry.timestamp).toLocaleString() }]}
          detail={<List.Item.Detail markdown={entry.resultMarkdown} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Result" content={entry.resultMarkdown} />
                <Action
                  title="View Raw Debug Data"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => push(<DebugView entry={entry} />)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Manage">
                <Action
                  title="Delete Entry"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteEntry(entry.id)}
                />
                <Action
                  title="Clear All History"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={clearAll}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
