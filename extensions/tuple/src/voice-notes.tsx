import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { escapeMarkdownText } from "./lib/capture";
import { TupleErrorDetail, TupleErrorEmptyView } from "./lib/empty-state";
import { TUPLE_DEEP_LINKS } from "./lib/tuple";
import { VoiceNote } from "./lib/types";
import { getVoiceNoteTranscript, listVoiceNotes, VoiceNoteFilter } from "./lib/voice-notes";

export default function VoiceNotes({ onUnavailable }: { onUnavailable: () => void }) {
  const [filter, setFilter] = useState<VoiceNoteFilter>("received");
  const notes = usePromise(listVoiceNotes, [filter], { onError: () => {} });
  const { pop } = useNavigation();
  useEffect(() => {
    if (notes.data === null) {
      onUnavailable();
      pop();
    }
  }, [notes.data, onUnavailable, pop]);

  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={notes.revalidate}
    />
  );
  return (
    <List
      navigationTitle="Voice Notes"
      isLoading={notes.isLoading}
      searchBarPlaceholder="Search people"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show Voice Notes"
          value={filter}
          onChange={(value) => setFilter(value as VoiceNoteFilter)}
        >
          <List.Dropdown.Item title="Received" value="received" />
          <List.Dropdown.Item title="Unheard Received" value="unheard" />
          <List.Dropdown.Item title="Sent" value="sent" />
          <List.Dropdown.Item title="All Notes" value="all" />
        </List.Dropdown>
      }
    >
      {(notes.data ?? []).map((note) => (
        <List.Item
          key={note.id}
          title={note.person.full_name || note.person.email}
          subtitle={note.direction === "received" ? "Received" : "Sent"}
          keywords={[note.person.email]}
          icon={Icon.Waveform}
          accessories={[
            ...(note.state === "other_mac"
              ? [{ tag: "On Another Mac" }]
              : note.state === "damaged"
                ? [{ tag: "Can't Decrypt" }]
                : !note.heard
                  ? [{ tag: "Unheard" }]
                  : []),
            { text: durationLabel(note.duration_ms) },
            { date: new Date(note.sent_at) },
          ]}
          actions={
            <ActionPanel>
              {note.direction === "received" && note.state === "ready" && (
                <Action.Push
                  title="View Transcript"
                  icon={Icon.Text}
                  target={<VoiceNoteDetail note={note} onUnavailable={notes.revalidate} />}
                />
              )}
              <Action.CopyToClipboard title="Copy Email" content={note.person.email} />
              <Action.Open title="Open Tuple" target={TUPLE_DEEP_LINKS.open} />
              {refresh}
            </ActionPanel>
          }
        />
      ))}
      {notes.error ? (
        <TupleErrorEmptyView error={notes.error} onRetry={notes.revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Waveform}
          title="No Voice Notes"
          description="Voice notes from the last seven days appear here."
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      )}
    </List>
  );
}

function VoiceNoteDetail({ note, onUnavailable }: { note: VoiceNote; onUnavailable: () => void }) {
  const transcript = usePromise(getVoiceNoteTranscript, [note.id], { onError: () => {} });
  const { pop } = useNavigation();
  useEffect(() => {
    if (transcript.data === null) {
      onUnavailable();
      pop();
    }
  }, [transcript.data, onUnavailable, pop]);
  if (transcript.error) return <TupleErrorDetail error={transcript.error} onRetry={transcript.revalidate} />;
  const name = note.person.full_name || note.person.email;
  const text = transcript.data?.text;
  return (
    <Detail
      navigationTitle={`Voice Note from ${name}`}
      isLoading={transcript.isLoading}
      markdown={text === undefined ? "Transcribing on this Mac…" : escapeMarkdownText(text)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={name} />
          <Detail.Metadata.Label title="Sent" text={new Date(note.sent_at).toLocaleString()} />
          <Detail.Metadata.Label title="Length" text={durationLabel(note.duration_ms)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Transcription" text="On this Mac" />
          <Detail.Metadata.Label title="Heard Status" text="Unchanged" />
        </Detail.Metadata>
      }
      actions={
        text !== undefined ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Transcript" content={text} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function durationLabel(ms: number): string {
  const seconds = Math.round(ms / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
