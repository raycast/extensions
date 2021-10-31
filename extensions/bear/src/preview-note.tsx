import { Detail } from "@raycast/api";
import { Note } from "./bear-db";

export default function PreviewNote({ note }: { note: Note }) {
  const noteContent = note.encrypted ? 
    `# ${note.title}\n\n*This note's content is encrypted*` :
    note.text;

  return <Detail markdown={noteContent}></Detail>;
}
