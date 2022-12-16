import { List, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";

import { SearchNotePreferences, NoteListProps } from "../../utils/interfaces";
import { MAX_RENDERED_NOTES } from "../../utils/constants";
import { tagsForNotes } from "../../utils/yaml";
import { NoteListItem } from "./NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";
import { filterNotes } from "../../utils/search";

export function NoteList(props: NoteListProps) {
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
