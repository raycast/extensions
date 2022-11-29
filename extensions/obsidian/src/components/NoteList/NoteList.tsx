import { List, getPreferenceValues } from "@raycast/api";
import React, { useState, useMemo } from "react";

import { Note, Vault, SearchNotePreferences, SearchArguments } from "../../utils/interfaces";
import { MAX_RENDERED_NOTES, NoteAction } from "../../utils/constants";
import { tagsForNotes } from "../../utils/yaml";
import { NoteListItem } from "./NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";
import { filterNotes } from "../../utils/search";

export function NoteList(props: {
  title?: string;
  vault: Vault;
  notes: Note[] | undefined;
  allNotes?: Note[];
  setNotes?: (notes: Note[]) => void;
  isLoading?: boolean;
  searchArguments: SearchArguments;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
  onDelete?: (note: Note, vault: Vault) => void;
  onSearchChange?: (search: string) => void;
}) {
  const { notes, allNotes, vault, isLoading, title, searchArguments, setNotes, action, onDelete, onSearchChange } =
    props;

  const pref = getPreferenceValues<SearchNotePreferences>();

  const [searchText, setSearchText] = useState(searchArguments.searchArgument ?? "");
  const list = useMemo(() => filterNotes(notes ?? [], searchText, pref.searchContent), [notes, searchText]);
  const _notes = list.slice(0, MAX_RENDERED_NOTES);

  const tags = tagsForNotes(allNotes ?? []);

  let isNotesUndefined = notes === undefined;

  if (notes !== undefined) {
    isNotesUndefined = notes.length == 0;
  }

  if (isLoading !== undefined) {
    isNotesUndefined = isLoading;
  }

  return (
    <List
      throttle={true}
      isLoading={isNotesUndefined}
      isShowingDetail={pref.showDetail}
      onSearchTextChange={(value) => {
        setSearchText(value);
      }}
      navigationTitle={title}
      searchText={searchText}
      searchBarAccessory={
        <NoteListDropdown tags={tags} setNotes={setNotes} allNotes={allNotes} searchArguments={searchArguments} />
      }
    >
      {_notes?.map((note) => (
        <NoteListItem note={note} vault={vault} key={note.path} pref={pref} onDelete={onDelete} action={action} />
      ))}
    </List>
  );
}
