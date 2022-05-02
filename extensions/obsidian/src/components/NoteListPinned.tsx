import { Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

import { Note } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes, unpinNote } from "../utils/PinNoteUtils";

export function NoteListPinned(props: { vaultPath: string }) {
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>();

  useEffect(() => {
    const pinnedNotes = getPinnedNotes(props.vaultPath);
    setPinnedNotes(pinnedNotes);
  }, []);

  function unpinNoteAction(note: Note) {
    return (
      <Action
        title="Unpin Note"
        shortcut={{ modifiers: ["opt", "cmd"], key: "u" }}
        onAction={() => {
          const pinnedNotes = unpinNote(note, props.vaultPath);
          setPinnedNotes(pinnedNotes);
        }}
        icon={Icon.XmarkCircle}
      />
    );
  }

  return (
    <NoteList
      notes={pinnedNotes}
      action={unpinNoteAction}
      isLoading={pinnedNotes === undefined}
      vaultPath={props.vaultPath}
    />
  );
}
