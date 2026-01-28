import { ObsidianVault } from "@/obsidian";
import { Detail } from "@raycast/api";
import { useMemo } from "react";
import { useNotes } from "../utils/hooks";
import { NoteQuickLook } from "./NoteQuickLook";

export function RandomNote(props: { vault: ObsidianVault; showTitle: boolean }) {
  const { vault, showTitle } = props;
  const { notes, loading: notesLoading } = useNotes(vault);

  const randomNote = useMemo(() => {
    if (!notesLoading && notes && notes.length > 0) {
      return notes[Math.floor(Math.random() * notes.length)];
    }
    return undefined;
  }, [notes, notesLoading]);

  if (notesLoading || !randomNote) {
    return <Detail isLoading={true} />;
  }

  return <NoteQuickLook note={randomNote} vault={vault} showTitle={showTitle} />;
}
