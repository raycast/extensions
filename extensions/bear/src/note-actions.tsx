import { ActionPanel, OpenAction, Icon, PushAction } from "@raycast/api";
import { Note } from "./bear-db";
import NoteLinks from "./note-links";
import PreviewNote from "./preview-note";

function NotePreviewAction({ note }: { note: Note }) {
  return (<PushAction
    title="Show Note Preview"
    target={<PreviewNote note={note} />}
    icon={Icon.Text}
    shortcut={{ modifiers: ["cmd"], key: "p" }}
  />);
}

export default function NoteActions({ isNotePreview, note }: { isNotePreview: boolean, note: Note}) {
    return (
        <ActionPanel>
        <OpenAction
          title="Open in Bear"
          target={`bear://x-callback-url/open-note?id=${note.id}&edit=yes`}
          icon={Icon.Sidebar}
        />
        <OpenAction
          title="Open in New Bear Window"
          target={`bear://x-callback-url/open-note?id=${note.id}&new_window=yes&edit=yes`}
          icon={Icon.Window}
        />
        { isNotePreview ? null : <NotePreviewAction note={ note }/> }
        <PushAction
          title="Show Note Links"
          target={<NoteLinks note={note} />}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
      </ActionPanel>
    );
}