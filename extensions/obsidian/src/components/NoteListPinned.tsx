import { Action, getPreferenceValues, Icon, Color } from "@raycast/api";
import React, { useState, useEffect, useMemo } from "react";

import { Note, SearchNotePreferences, Vault } from "../utils/interfaces";
import { NoteList } from "./NoteList";
import { getPinnedNotes, migratePinnedNotes, resetPinnedNotes } from "../utils/pinNoteUtils";
import { filterNotes, getListOfTags } from "../utils/utils";
import { MAX_RENDERED_NOTES, NoteAction } from "../utils/constants";
import { NoteActions, OpenNoteActions } from "../utils/actions";

export function NoteListPinned(props: { vault: Vault }) {
  const { searchContent } = getPreferenceValues<SearchNotePreferences>();
  const vault = props.vault;

  migratePinnedNotes();

  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [input, setInput] = useState<string>("");
  const list = useMemo(() => filterNotes(pinnedNotes, input, searchContent), [pinnedNotes, input]);

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

  function actions(note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) {
    return (
      <React.Fragment>
        <OpenNoteActions note={note} vault={vault} actionCallback={actionCallback} />
        <NoteActions note={note} vault={vault} actionCallback={actionCallback} />
        {resetPinnedNotesAction(note)}
      </React.Fragment>
    );
  }

  const currentPinnedNotes = getPinnedNotes(vault);
  const tags = getListOfTags(currentPinnedNotes ?? []);

  useEffect(() => {
    setPinnedNotes(currentPinnedNotes);
    setAllNotes(currentPinnedNotes);
  }, []);

  return (
    <NoteList
      notes={list.slice(0, MAX_RENDERED_NOTES)}
      allNotes={allNotes}
      setNotes={setPinnedNotes}
      tags={tags}
      isLoading={pinnedNotes === undefined}
      vault={vault}
      action={actions}
      onSearchChange={setInput}
      onDelete={onDelete}
    />
  );
}
