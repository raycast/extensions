import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { existsSync } from "fs";
import {
  fromCachedHistoryEntry,
  HistoryEntry,
  listCachedHistory,
} from "./lib/history";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}m ${s}s`;
}

function previewText(text: string): string {
  if (!text) return "(empty)";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine;
}

function entryKey(entry: Pick<HistoryEntry, "id" | "jsonPath">): string {
  return entry.id || entry.jsonPath;
}

export default function SearchTranscripts() {
  const {
    isLoading,
    data: cachedEntries = [],
    mutate,
  } = useCachedPromise(listCachedHistory, [], {
    initialData: [],
    failureToastOptions: { title: "Could not read history" },
  });

  const entries = cachedEntries.map(fromCachedHistoryEntry);

  async function handleDelete(entry: HistoryEntry) {
    const key = entryKey(entry);
    try {
      const toTrash: string[] = [];
      if (existsSync(entry.jsonPath)) toTrash.push(entry.jsonPath);
      if (existsSync(entry.audioPath)) toTrash.push(entry.audioPath);

      await mutate(
        (async () => {
          if (toTrash.length > 0) await trash(toTrash);
        })(),
        {
          optimisticUpdate(cached) {
            return cached.filter((e) => entryKey(e) !== key);
          },
        },
      );
    } catch (err) {
      await showFailureToast(err, { title: "Could not delete entry" });
    }
  }

  async function handleRevealRecording(entry: HistoryEntry) {
    try {
      if (!existsSync(entry.audioPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Recording file missing",
          message: entry.audioPath,
        });
        return;
      }
      await showInFinder(entry.audioPath);
    } catch (err) {
      await showFailureToast(err, { title: "Could not reveal recording" });
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
          description="Press your Spokenly shortcut to dictate something"
        />
      ) : (
        entries.map((entry) => {
          const accessories: List.Item.Accessory[] = [];
          if (entry.modelId) accessories.push({ tag: entry.modelId });
          if (entry.duration != null)
            accessories.push({ text: formatDuration(entry.duration) });
          accessories.push({ date: entry.date });

          const md = entry.isError
            ? "_This recording failed to transcribe._"
            : entry.text || "_Empty transcript_";

          return (
            <List.Item
              key={entryKey(entry)}
              title={previewText(entry.text)}
              keywords={[entry.text, entry.modelId ?? ""].filter(Boolean)}
              icon={
                entry.isError
                  ? { source: Icon.ExclamationMark, tintColor: Color.Red }
                  : Icon.Waveform
              }
              accessories={accessories}
              detail={<List.Item.Detail markdown={md} />}
              actions={
                <ActionPanel>
                  {entry.text && (
                    <>
                      <Action.CopyToClipboard
                        title="Copy Transcript"
                        content={entry.text}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.Paste
                        title="Paste Transcript"
                        content={entry.text}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "return",
                        }}
                      />
                    </>
                  )}
                  <Action
                    title="Reveal Recording in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleRevealRecording(entry)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Recording File"
                    icon={Icon.Document}
                    content={{ file: entry.audioPath }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Recording Path"
                    icon={Icon.Link}
                    content={entry.audioPath}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.ShowInFinder
                    title="Reveal JSON in Finder"
                    path={entry.jsonPath}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action
                    title="Delete Transcript"
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
