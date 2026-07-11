import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { execa } from "execa";
import { join } from "path";
import {
  deleteEntry,
  displayText,
  getHistory,
  HistoryEntry,
  toggleSaved,
} from "./lib/db";
import { RECORDINGS_DIR } from "./lib/constants";

export default function SearchTranscripts() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setEntries(getHistory());
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not read history",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleSaved(entry: HistoryEntry) {
    try {
      toggleSaved(entry.id);
      load();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update entry",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleDelete(entry: HistoryEntry) {
    try {
      await deleteEntry(entry.id);
      load();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete entry",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleOpenRecording(entry: HistoryEntry) {
    try {
      await execa("open", ["-R", join(RECORDINGS_DIR, entry.file_name)]);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open recording",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search transcripts..."
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No transcriptions yet"
          description="Press your Handy shortcut to start recording"
        />
      ) : (
        entries.map((entry) => {
          const text = displayText(entry);
          const md = [
            entry.post_processed_text
              ? `### Post-Processed\n${entry.post_processed_text}`
              : null,
            `### Original\n${entry.transcription_text}`,
          ]
            .filter(Boolean)
            .join("\n\n---\n\n");

          return (
            <List.Item
              key={entry.id}
              title={entry.title}
              subtitle={text.slice(0, 80)}
              keywords={[
                entry.transcription_text,
                entry.post_processed_text ?? "",
              ].filter(Boolean)}
              accessories={[
                ...(entry.saved ? [{ icon: Icon.Star }] : []),
                { date: new Date(entry.timestamp * 1000) },
              ]}
              detail={<List.Item.Detail markdown={md} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Transcript"
                    content={text}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title={
                      entry.saved ? "Remove from Saved" : "Save Transcript"
                    }
                    icon={entry.saved ? Icon.StarDisabled : Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleToggleSaved(entry)}
                  />
                  <Action
                    title="Open Recording in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleOpenRecording(entry)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
