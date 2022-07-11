import React, { useEffect, useMemo, useState } from "react";

import fs from "fs";

import { Note, SearchNotePreferences, Vault } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import NoteLoader from "../utils/NoteLoader";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { filterNotes } from "../utils/utils";
import { OpenInObsidianAction } from "../utils/actions";
import { NoteAction } from "../utils/constants";

export function SimpleNoteList(props: { vault: Vault; title: string }) {
  const { searchContent } = getPreferenceValues<SearchNotePreferences>();
  const vault = props.vault;

  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState<string>("");
  const list = useMemo(() => filterNotes(notes, input, searchContent), [notes, input]);

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

  function actions(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) {
    return (
      <React.Fragment>
        <OpenInObsidianAction note={note} />
      </React.Fragment>
    );
  }

  return (
    <NoteList
      title={props.title}
      notes={notes}
      vault={vault}
      onSearchChange={setInput}
      onDelete={(note) => {
        console.log("Delete " + note.title);
      }}
      action={actions}
    ></NoteList>
  );
}
