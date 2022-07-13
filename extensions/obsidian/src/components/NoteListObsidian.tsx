import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import fs from "fs";

import NoteLoader from "../utils/NoteLoader";
import { Note, Vault, SearchNotePreferences } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { filterNotes, getListOfTags } from "../utils/utils";
import { MAX_RENDERED_NOTES, NoteAction } from "../utils/constants";
import { NoteActions, OpenNoteActions } from "../utils/actions";

export function NoteListObsidian(props: { vault: Vault; showTitle: boolean }) {
  const { searchContent } = getPreferenceValues<SearchNotePreferences>();

  const { showTitle, vault } = props;
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);

  const [input, setInput] = useState<string>("");
  const list = useMemo(() => filterNotes(notes, input, searchContent), [notes, input]);

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
        setAllNotes(_notes);
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

  const tags = getListOfTags(allNotes);

  return (
    <NoteList
      title={showTitle ? "Search Note in " + vault.name : ""}
      notes={list.slice(0, MAX_RENDERED_NOTES)}
      allNotes={allNotes}
      setNotes={setNotes}
      vault={vault}
      onSearchChange={setInput}
      onDelete={onDelete}
      tags={tags}
      action={(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => {
        return (
          <React.Fragment>
            <OpenNoteActions note={note} vault={vault} actionCallback={actionCallback} />
            <NoteActions note={note} vault={vault} actionCallback={actionCallback} />
          </React.Fragment>
        );
      }}
    />
  );
}
