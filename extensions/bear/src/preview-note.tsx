import { Detail } from "@raycast/api";
import { Note } from "./bear-db";

export default function PreviewNote({ note }: { note: Note }) {
  return <Detail markdown={note.text}></Detail>;
}
