import { Action, getPreferenceValues, Icon, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";

import { Note, SearchNotePreferences, Vault } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes, resetPinnedNotes } from "../utils/PinNoteUtils";
import { filterNotes } from "../utils/utils";
import { MAX_RENDERED_NOTES } from "../utils/constants";

export function NoteListPinned(props: { vault: Vault }) {
  const pref: SearchNotePreferences = getPreferenceValues();

  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [input, setInput] = useState<string>("");
  const list = useMemo(() => filterNotes(pinnedNotes, input, pref.searchContent), [pinnedNotes, input]);
  const vault = props.vault;

  function onDelete(note: Note) {
    setPinnedNotes(pinnedNotes.filter((n) => n.path !== note.path));
  }

  function resetPinnedNotesAction(note: Note) {
    return (
      <Action
        title="Reset Pinned Notes"
        icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
        shortcut={{ modifiers: ["opt"], key: "r" }}
        onAction={async () => {
          if (await resetPinnedNotes(vault)) {
            setPinnedNotes((pinnedNotes) => []);
          }
        }}
      />
    );
  }

  useEffect(() => {
    const pinnedNotes = getPinnedNotes(vault);
    setPinnedNotes(pinnedNotes);
  }, []);

  return (
    <NoteList
      notes={list.slice(0, MAX_RENDERED_NOTES)}
      isLoading={pinnedNotes === undefined}
      vault={vault}
      action={resetPinnedNotesAction}
      onSearchChange={setInput}
      onDelete={onDelete}
    />
  );
}
