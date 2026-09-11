import { useCallback, useEffect, useState } from "react";
import { writeFile } from "fs/promises";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { format } from "util";
import { HistoryEntry, OutputFormat } from "./types";
import { formatTranscription, hasTimedSegments, outputExtension } from "./utils/format";
import { clearHistory, loadHistory, pruneHistory } from "./utils/history";
import { uniqueSiblingPath } from "./utils/files";
import { getHistoryPreferences } from "./preferences";

export default function HistoryCommand() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prefs = getHistoryPreferences();
  const retentionDays = parseInt(prefs.historyRetentionDays || "30", 10);
  const maxEntries = parseInt(prefs.historyMaxEntries || "50", 10);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await pruneHistory(maxEntries, retentionDays);
    const data = await loadHistory();
    setEntries(data);
    setIsLoading(false);
  }, [maxEntries, retentionDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleClear() {
    await clearHistory();
    setEntries([]);
    await showToast({
      style: Toast.Style.Success,
      title: "History cleared",
    });
  }

  return (
    <List
      navigationTitle="Transcription History"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
          <Action
            title="Clear History"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            onAction={handleClear}
          />
        </ActionPanel>
      }
    >
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No transcriptions yet"
          description="Transcribe an audio or video file to see it here."
        />
      ) : (
        entries.map((entry) => <HistoryListItem key={entry.id} entry={entry} />)
      )}
    </List>
  );
}

function HistoryListItem({ entry }: { entry: HistoryEntry }) {
  const { push } = useNavigation();
  const date = new Date(entry.timestamp);
  const dateText = date.toLocaleString();
  const fileName = entry.filePath.split("/").pop() || entry.filePath;

  const handleCopy = async (text: string) => {
    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  };

  const handleSave = async (text: string, outputFormat: OutputFormat) => {
    const suffix = ` - Transcript${outputExtension(outputFormat)}`;
    const targetPath = await uniqueSiblingPath(entry.filePath, suffix);
    try {
      await writeFile(targetPath, text, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved transcript",
        message: targetPath,
      });
      await showInFinder(targetPath);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save transcript",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const includeSpeakerLabels =
    entry.diarization ?? entry.segments?.some((segment) => Boolean(segment.speaker)) ?? false;
  const formatted = formatTranscription(entry, false, includeSpeakerLabels);
  const srtAvailable = hasTimedSegments(entry);

  const openDetail = () => {
    push(
      <Detail
        navigationTitle={fileName}
        markdown={`# ${format(
          "%s (%s)",
          fileName,
          dateText,
        )}\n\n**Provider:** ${entry.provider}  \n**Audio type:** ${entry.audioType}\n\n---\n\n${formatted.markdown}`}
        actions={
          <ActionPanel>
            <Action
              title="Copy Result (Markdown)"
              icon={Icon.Clipboard}
              onAction={() => handleCopy(formatted.markdown)}
            />
            <Action title="Copy Plain Text" icon={Icon.Clipboard} onAction={() => handleCopy(formatted.plainText)} />
            {srtAvailable && formatted.srt && (
              <Action title="Copy SRT" icon={Icon.Clipboard} onAction={() => handleCopy(formatted.srt || "")} />
            )}
            <Action
              title="Save as Markdown"
              icon={Icon.Document}
              onAction={() => handleSave(formatted.markdown, "markdown")}
            />
            <Action
              title="Save as Plain Text"
              icon={Icon.Document}
              onAction={() => handleSave(formatted.plainText, "plain")}
            />
            {srtAvailable && formatted.srt && (
              <Action
                title="Save as SRT"
                icon={Icon.Document}
                onAction={() => handleSave(formatted.srt || "", "srt")}
              />
            )}
          </ActionPanel>
        }
      />,
    );
  };

  return (
    <List.Item
      title={fileName}
      subtitle={dateText}
      accessories={[{ text: entry.provider }]}
      actions={
        <ActionPanel>
          <Action title="View Transcript" icon={Icon.Eye} onAction={openDetail} />
          <Action title="Copy Plain Text" icon={Icon.Clipboard} onAction={() => handleCopy(formatted.plainText)} />
          <Action
            title="Save as Markdown"
            icon={Icon.Document}
            onAction={() => handleSave(formatted.markdown, "markdown")}
          />
        </ActionPanel>
      }
    />
  );
}
