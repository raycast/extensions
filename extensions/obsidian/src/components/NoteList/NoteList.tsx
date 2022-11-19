import { List, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";

import { Note, Vault, SearchNotePreferences, SearchArguments } from "../../utils/interfaces";
import { NoteAction } from "../../utils/constants";
import { tagsForNotes } from "../../utils/yaml";
import { NoteListItem } from "./NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";

export function NoteList(props: {
  notes: Note[] | undefined;
  vault: Vault;
  allNotes?: Note[];
  setNotes?: (notes: Note[]) => void;
  isLoading?: boolean;
  title?: string;
  searchArguments?: SearchArguments;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
  onDelete?: (note: Note, vault: Vault) => void;
  onSearchChange?: (search: string) => void;
}) {
  const { notes, allNotes, vault, isLoading, title, searchArguments, setNotes, action, onDelete, onSearchChange } =
    props;
  const pref = getPreferenceValues<SearchNotePreferences>();
  const [searchText, setSearchText] = useState(searchArguments ? searchArguments.searchArgument : "");
  const { showDetail } = pref;

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
      isLoading={isNotesUndefined}
      isShowingDetail={showDetail}
      onSearchTextChange={(value) => {
        onSearchChange?.(value);
        setSearchText(value);
      }}
      navigationTitle={title}
      searchText={searchText}
      searchBarAccessory={
        <NoteListDropdown tags={tags} setNotes={setNotes} allNotes={allNotes} searchArguments={searchArguments} />
      }
    >
      {notes?.map((note) => (
        <NoteListItem note={note} vault={vault} key={note.path} pref={pref} onDelete={onDelete} action={action} />
      ))}
    </List>
  );
}
