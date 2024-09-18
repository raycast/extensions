import { useNotes } from "../utils/hooks";
import { Vault } from "../utils/interfaces";
import { NoteQuickLook } from "./NoteQuickLook";

export function RandomNote(props: { vault: Vault; showTitle: boolean }) {
  const { vault, showTitle } = props;
  const [notes] = useNotes(vault);
  const randomNote = notes[Math.floor(Math.random() * notes.length)];

  return <NoteQuickLook note={randomNote} showTitle={showTitle}></NoteQuickLook>;
}
