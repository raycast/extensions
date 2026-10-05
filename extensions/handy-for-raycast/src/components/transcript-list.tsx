import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { compact, showFailure } from "../lib/errors";
import { escapeMarkdown, formatBytes } from "../lib/format";
import {
  deleteEntry,
  getHistory,
  HistoryEntry,
  preferredText,
  recordingExists,
  recordingPath,
  recordingSize,
  renameEntry,
  toggleSaved,
  wordsIn,
} from "../lib/history";

function RenameForm({ entry, onDone }: { entry: HistoryEntry; onDone: () => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(entry.title);
  async function submit() {
    const next = title.trim();
    if (!next) return void (await showToast({ style: Toast.Style.Failure, title: "A title is required" }));
    try {
      renameEntry(entry, next);
      onDone();
      pop();
      await showToast({ style: Toast.Style.Success, title: "Transcript renamed" });
    } catch (error) {
      await showFailure("Could not rename transcript", error);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Transcript" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} autoFocus />
    </Form>
  );
}

function detailMarkdown(entry: HistoryEntry): string {
  const original = escapeMarkdown(entry.transcription_text || "No transcription text");
  const processed = entry.post_processed_text
    ? `## Post-Processed\n\n${escapeMarkdown(entry.post_processed_text)}\n\n---\n\n`
    : "";
  const prompt = entry.post_process_prompt
    ? `\n\n---\n\n### Prompt\n\n${escapeMarkdown(entry.post_process_prompt)}`
    : "";
  return `${processed}## Original\n\n${original}${prompt}`;
}

export default function TranscriptList({ limit, title = "Transcripts" }: { limit?: number; title?: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setEntries(getHistory(limit));
    } catch (error) {
      await showFailure("Could not read Handy history", error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      entries.filter(
        (entry) => filter === "all" || (filter === "saved" ? entry.saved : Boolean(entry.post_processed_text)),
      ),
    [entries, filter],
  );

  async function remove(entry: HistoryEntry) {
    const confirmed = await confirmAlert({
      title: "Delete this transcript?",
      message: recordingExists(entry)
        ? "Its audio recording will also be moved to the Trash."
        : "This cannot be undone.",
      primaryAction: { title: "Delete Transcript", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteEntry(entry);
      setEntries((items) => items.filter((item) => item.id !== entry.id));
      await showToast({ style: Toast.Style.Success, title: "Transcript deleted" });
    } catch (error) {
      await showFailure("Could not delete transcript", error);
    }
  }

  async function save(entry: HistoryEntry) {
    try {
      toggleSaved(entry);
      setEntries((items) => items.map((item) => (item.id === entry.id ? { ...item, saved: !item.saved } : item)));
    } catch (error) {
      await showFailure("Could not update transcript", error);
    }
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={title}
      searchBarPlaceholder="Search titles and transcript text…"
      searchBarAccessory={
        limit ? undefined : (
          <List.Dropdown tooltip="Filter Transcripts" value={filter} onChange={setFilter}>
            <List.Dropdown.Item title="All Transcripts" value="all" icon={Icon.List} />
            <List.Dropdown.Item title="Saved" value="saved" icon={Icon.Star} />
            <List.Dropdown.Item title="Post-Processed" value="processed" icon={Icon.Stars} />
          </List.Dropdown>
        )
      }
    >
      {!loading && visible.length === 0 ? (
        <List.EmptyView
          icon={Icon.Microphone}
          title={entries.length ? "No Matching Transcripts" : "No Transcripts Yet"}
          description={
            entries.length ? "Try another filter or search." : "Start a recording in Handy, then come back here."
          }
        />
      ) : (
        visible.map((entry) => {
          const text = preferredText(entry);
          const audio = recordingExists(entry);
          return (
            <List.Item
              key={entry.id}
              icon={entry.saved ? Icon.Star : Icon.Text}
              title={entry.title || compact(text, 60)}
              subtitle={compact(text, 100)}
              keywords={[entry.transcription_text, entry.post_processed_text || "", entry.title]}
              accessories={[
                ...(entry.post_processed_text ? [{ tag: { value: "AI", color: "purple" as const } }] : []),
                { date: new Date(entry.timestamp * 1000) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(entry)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={new Date(entry.timestamp * 1000).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label title="Words" text={String(wordsIn(entry))} />
                      <List.Item.Detail.Metadata.Label
                        title="Saved"
                        icon={entry.saved ? Icon.Checkmark : Icon.Minus}
                        text={entry.saved ? "Yes" : "No"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Audio"
                        text={audio ? formatBytes(recordingSize(entry)) : "Unavailable"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Transcript"
                      content={text}
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                    />
                    <Action
                      title="Paste Transcript"
                      icon={Icon.TextCursor}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => Clipboard.paste(text)}
                    />
                    <Action.Push
                      title="Rename Transcript"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<RenameForm entry={entry} onDone={load} />}
                    />
                    <Action
                      title={entry.saved ? "Remove from Saved" : "Save Transcript"}
                      icon={entry.saved ? Icon.StarDisabled : Icon.Star}
                      shortcut={Keyboard.Shortcut.Common.Save}
                      onAction={() => save(entry)}
                    />
                  </ActionPanel.Section>
                  {audio && (
                    <ActionPanel.Section title="Recording">
                      <Action.Open
                        title="Play Recording"
                        target={recordingPath(entry)}
                        icon={Icon.Play}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <Action.ShowInFinder path={recordingPath(entry)} />
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <Action
                      title="Delete Transcript"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => remove(entry)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={load}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
