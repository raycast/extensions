import { Action, Icon, Color } from "@raycast/api";
import React, { useState, useEffect } from "react";

import { Note, SearchArguments, Vault } from "../../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes, migratePinnedNotes, resetPinnedNotes } from "../../utils/pinNoteUtils";
import { NoteActions, OpenNoteActions } from "../../utils/actions";
import { NoteAction } from "../../utils/constants";

export function NoteListPinned(props: { vault: Vault; showTitle: boolean; searchArguments: SearchArguments }) {
  const { showTitle, vault, searchArguments } = props;

  migratePinnedNotes();

  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);

  function onDelete(note: Note) {
    setPinnedNotes(pinnedNotes.filter((n) => n.path !== note.path));
  }

  function resetPinnedNotesAction() {
    return (
      <Action
        title="Reset Pinned Notes"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        shortcut={{ modifiers: ["opt"], key: "r" }}
        onAction={async () => {
          if (await resetPinnedNotes(vault)) {
            setPinnedNotes(() => []);
          }
        }}
      />
    );
  }

  function actions(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) {
    return (
      <React.Fragment>
        <OpenNoteActions note={note} notes={allNotes} vault={vault} actionCallback={actionCallback} />
        <NoteActions note={note} notes={allNotes} vault={vault} actionCallback={actionCallback} />
        {resetPinnedNotesAction()}
      </React.Fragment>
    );
  }

  const currentPinnedNotes = getPinnedNotes(vault);

  useEffect(() => {
    setPinnedNotes(currentPinnedNotes);
    setAllNotes(currentPinnedNotes);
  }, []);

  return (
    <NoteList
      title={showTitle ? "Pinned Notes for " + vault.name : ""}
      notes={pinnedNotes}
      allNotes={allNotes}
      setNotes={setPinnedNotes}
      isLoading={pinnedNotes === undefined}
      vault={vault}
      searchArguments={searchArguments}
      action={actions}
      onDelete={onDelete}
    />
  );
}
