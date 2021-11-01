import { Detail } from "@raycast/api";
import { Note } from "./bear-db";
import NoteActions from "./note-actions";

export default function PreviewNote({ note }: { note: Note }) {
  const noteContent = note.encrypted ? 
    `# ${note.title}\n\n*This note's content is encrypted*` :
    note.text;
  return (<Detail
    markdown={noteContent}
    navigationTitle={note.title}
    actions={<NoteActions isNotePreview={true} note={ note }/>}
  />);
}
