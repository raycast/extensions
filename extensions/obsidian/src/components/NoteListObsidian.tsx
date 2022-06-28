import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs";

import NoteLoader from "../utils/NoteLoader";
import { Note, Vault, SearchNotePreferences } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { filterNotes } from "../utils/utils";
import { MAX_RENDERED_NOTES } from "../utils/constants";

export function NoteListObsidian(props: { vault: Vault }) {
  const pref: SearchNotePreferences = getPreferenceValues();

  const vault = props.vault;
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState<string>("");
  const list = useMemo(() => filterNotes(notes, input, pref.searchContent), [notes, input]);

  function onDelete(note: Note) {
    setNotes(notes.filter((n) => n.path !== note.path));
  }

  useEffect(() => {
    async function fetch() {
      try {
        await fs.promises.access(vault.path + "/.");
        const nl = new NoteLoader(vault);
        const _notes = nl.loadNotes();

        setNotes(_notes);
      } catch (error) {
        showToast({
          title: "The path set in preferences doesn't exist",
          message: "Please set a valid path in preferences",
          style: Toast.Style.Failure,
        });
      }
    }
    fetch();
  }, []);

  return (
    <NoteList notes={list.slice(0, MAX_RENDERED_NOTES)} vault={vault} onSearchChange={setInput} onDelete={onDelete} />
  );
}
