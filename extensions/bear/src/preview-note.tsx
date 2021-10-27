import { Detail } from "@raycast/api";
import { Note } from "./bear-db";
import NoteActions from "./note-actions";

export default function PreviewNote({ note }: { note: Note }) {
  return (<Detail
    markdown={note.text}
    navigationTitle={note.title}
    actions={<NoteActions isNotePreview={true} note={ note }/>}
  />);
}
