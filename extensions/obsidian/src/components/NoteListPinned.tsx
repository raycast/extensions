import { useState, useEffect, useMemo } from "react";

import { Note, SearchNotePreferences } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes } from "../utils/PinNoteUtils";
import { getPreferenceValues } from "@raycast/api";
import { filterNotes } from "../utils/utils";
import { MAX_RENDERED_NOTES } from "../utils/constants";

export function NoteListPinned(props: { vaultPath: string }) {
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [input, setInput] = useState<string>("");

  const pref: SearchNotePreferences = getPreferenceValues();

  const list = useMemo(() => filterNotes(pinnedNotes, input, pref.searchContent), [pinnedNotes, input]);

  useEffect(() => {
    const pinnedNotes = getPinnedNotes(props.vaultPath);
    setPinnedNotes(pinnedNotes);
  }, []);

  return (
    <NoteList
      notes={list.slice(0, MAX_RENDERED_NOTES)}
      isLoading={pinnedNotes === undefined}
      vaultPath={props.vaultPath}
      onSearchChange={setInput}
    />
  );
}
