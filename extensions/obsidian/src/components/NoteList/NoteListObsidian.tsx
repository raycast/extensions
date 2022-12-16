import { showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import fs from "fs";

import { useNotes } from "../../utils/cache";
import { Note, Vault, SearchArguments } from "../../utils/interfaces";
import { NoteList } from "./NoteList";
import { NoteActions, OpenNoteActions } from "../../utils/actions";
import { NoteAction } from "../../utils/constants";

export function NoteListObsidian(props: { vault: Vault; showTitle: boolean; searchArguments: SearchArguments }) {
  const { showTitle, vault, searchArguments } = props;
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);

  function onDelete(note: Note) {
    setNotes(notes.filter((n) => n.path !== note.path));
    setAllNotes(allNotes.filter((n) => n.path !== note.path));
  }

  useEffect(() => {
    async function fetch() {
      try {
        await fs.promises.access(vault.path + "/.");
        const _notes = useNotes(vault);
        setNotes(_notes);
        setAllNotes(_notes);
      } catch (error) {
        showToast({
          title: "Path Error",
          message: "Please set a valid path in preferences or allow full-disk access in macOS settings.",
          style: Toast.Style.Failure,
        });
      }
    }
    fetch();
  }, []);

  return (
    <NoteList
      title={showTitle ? "Search Note in " + vault.name : ""}
      notes={notes}
      allNotes={allNotes}
      setNotes={setNotes}
      vault={vault}
      onDelete={onDelete}
      searchArguments={searchArguments}
      action={(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => {
        return (
          <React.Fragment>
            <OpenNoteActions note={note} notes={allNotes} vault={vault} actionCallback={actionCallback} />
            <NoteActions notes={allNotes} note={note} vault={vault} actionCallback={actionCallback} />
          </React.Fragment>
        );
      }}
    />
  );
}
