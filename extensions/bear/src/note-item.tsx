import { List } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { Note } from "./bear-db";
import NoteActions from "./note-actions";

export default function NoteItem({ note }: { note: Note }) {
  return (
    <List.Item
      key={note.id}
      title={note.title}
      subtitle={note.tags.map((t) => `#${t}`).join(" ")}
      icon={{ source: "command-icon.png" }}
      keywords={[note.id]}
      actions={<NoteActions isNotePreview={false} note={ note }/>}
      accessoryTitle={`edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`}
    />
  );
}

