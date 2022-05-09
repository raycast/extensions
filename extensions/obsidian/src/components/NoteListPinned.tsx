import { useState, useEffect } from "react";

import { Note } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes } from "../utils/PinNoteUtils";

export function NoteListPinned(props: { vaultPath: string }) {
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>();

  useEffect(() => {
    const pinnedNotes = getPinnedNotes(props.vaultPath);
    setPinnedNotes(pinnedNotes);
  }, []);

  return <NoteList notes={pinnedNotes} isLoading={pinnedNotes === undefined} vaultPath={props.vaultPath} />;
}
