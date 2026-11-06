import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { CleftNote } from "../lib/notes";

export function NoteActions({ note }: { note: CleftNote }) {
  return (
    <>
      <Action.Push
        title="Read Summary"
        icon={Icon.Document}
        target={<NoteDetail note={note} />}
      />
      <Action.Push
        title="Read Transcript"
        icon={Icon.Text}
        target={<NoteDetail note={note} transcript />}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      />
      <Action.CopyToClipboard title="Copy Summary" content={note.summary} />
      {note.transcript && (
        <Action.CopyToClipboard
          title="Copy Transcript"
          content={note.transcript}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
      )}
      <Action.Open
        title="Open Exported Markdown"
        target={note.path}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.ShowInFinder path={note.path} />
      {note.audioPath && (
        <Action.Open
          title="Play Exported Audio"
          target={note.audioPath}
          icon={Icon.Microphone}
        />
      )}
    </>
  );
}

export function NoteDetail({
  note,
  transcript = false,
}: {
  note: CleftNote;
  transcript?: boolean;
}) {
  const body = transcript
    ? (note.transcript || "No transcript was exported for this note.").replace(
        /[\\`*_{}[\]()#+.!|>~-]/g,
        "\\$&",
      )
    : note.summary;
  return (
    <Detail
      navigationTitle={transcript ? "Cleft Transcript" : "Cleft Summary"}
      markdown={body || "This note has an empty summary."}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={note.title} />
          <Detail.Metadata.Label
            title="Created"
            text={note.created.toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={note.updated.toLocaleString()}
          />
          <Detail.Metadata.Label title="Cleft ID" text={note.id} />
          <Detail.Metadata.TagList title="Tags">
            {note.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={transcript ? "Copy Transcript" : "Copy Summary"}
            content={transcript ? note.transcript : note.summary}
          />
          <Action.Open title="Open Exported Markdown" target={note.path} />
          <Action.ShowInFinder path={note.path} />
          {note.audioPath && (
            <Action.Open
              title="Play Exported Audio"
              target={note.audioPath}
              icon={Icon.Microphone}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
