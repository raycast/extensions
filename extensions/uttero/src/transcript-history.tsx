import { Action, ActionPanel, Clipboard, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { readFileSync } from "fs";
import { open } from "@raycast/api";

interface HistoryEntry {
  id: string;
  date: string;
  processedText: string;
  presetName?: string;
  wordCount: number;
  durationSeconds: number;
}

interface HistorySnapshot {
  entries: HistoryEntry[];
  lastSyncDate: string;
}

function loadHistory(): HistoryEntry[] {
  try {
    const home = process.env.HOME ?? "";
    const path = `${home}/Library/Application Support/Uttero/history-snapshot.json`;
    const raw = readFileSync(path, "utf-8");
    const snapshot: HistorySnapshot = JSON.parse(raw);
    return snapshot.entries ?? [];
  } catch {
    return [];
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function TranscriptHistory() {
  const entries = loadHistory();

  if (entries.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No transcripts yet"
          description="Dictate something in Uttero first."
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search transcripts…">
      {entries.map((entry) => {
        const preview = entry.processedText.slice(0, 80) + (entry.processedText.length > 80 ? "…" : "");
        return (
          <List.Item
            key={entry.id}
            title={preview}
            subtitle={entry.presetName ?? "Transcript"}
            accessories={[
              { text: `${entry.wordCount}w`, tooltip: `${entry.wordCount} words` },
              { text: formatDate(entry.date), tooltip: new Date(entry.date).toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(entry.processedText);
                    await showHUD("Copied to clipboard");
                  }}
                />
                <Action
                  title="Insert at Cursor"
                  icon={Icon.TextInput}
                  onAction={async () => {
                    try {
                      await open("uttero://insert-last");
                      await showHUD("Inserted last transcript");
                    } catch {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Uttero is not running",
                        message: "Start Uttero first.",
                      });
                    }
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Full Text"
                  content={entry.processedText}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
