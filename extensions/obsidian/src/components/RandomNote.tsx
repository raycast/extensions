import { Vault } from "../api/vault/vault.types";
import { useNotes } from "../utils/hooks";
import { NoteQuickLook } from "./NoteQuickLook";

export function RandomNote(props: { vault: Vault; showTitle: boolean }) {
  const { vault, showTitle } = props;
  const [notes] = useNotes(vault);
  const randomNote = notes[Math.floor(Math.random() * notes.length)];

  return <NoteQuickLook note={randomNote} vault={vault} showTitle={showTitle} allNotes={notes} />;
}
