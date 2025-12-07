import {
  List,
  getPreferenceValues,
  ActionPanel,
  Action,
  open,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";

import { NoteListProps } from "../../utils/interfaces";
import { MAX_RENDERED_NOTES } from "../../utils/constants";
import { tagsForNotes } from "../../utils/yaml";
import { NoteListItem } from "./NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";
import { filterNotes, filterNotesFuzzy } from "../../utils/search";
import { getObsidianTarget, ObsidianTargetType } from "../../utils/utils";
import { SearchNotePreferences } from "../../utils/preferences";
import { useNotesContext } from "../../utils/hooks";

export function NoteList(props: NoteListProps) {
  const { notes, vault, title, searchArguments, action } = props;

  const pref = getPreferenceValues<SearchNotePreferences>();
  const allNotes = useNotesContext();
  const [searchText, setSearchText] = useState(
    searchArguments.searchArgument ?? ""
  );
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  // Debounce search input by 150ms to reduce unnecessary filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 150);
    return () => clearTimeout(timer);
  }, [searchText]);

  const searchFunction = pref.fuzzySearch ? filterNotesFuzzy : filterNotes;

  const list = useMemo(
    () => searchFunction(notes ?? [], debouncedSearchText, pref.searchContent),
    [notes, debouncedSearchText]
  );
  const _notes = list.slice(0, MAX_RENDERED_NOTES);

  const tags = useMemo(() => tagsForNotes(allNotes), [allNotes]);

  function onNoteCreation() {
    const target = getObsidianTarget({
      type: ObsidianTargetType.NewNote,
      vault: vault,
      name: searchText,
    });
    open(target);
    //TODO: maybe dispatch here. But what if the user cancels the creation in Obsidian or renames it there? Then the cache would be out of sync.
  }

  const isNotesUndefined = notes === undefined;
  if (_notes.length == 0) {
    return (
      <List
        navigationTitle={title}
        onSearchTextChange={(value) => {
          setSearchText(value);
        }}
      >
        <List.Item
          title={`🗒️ Create Note "${searchText}"`}
          actions={
            <ActionPanel>
              <Action title="Create Note" onAction={onNoteCreation} />
            </ActionPanel>
          }
        />
      </List>
    );
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
        <NoteListDropdown tags={tags} searchArguments={searchArguments} />
      }
    >
      {_notes?.map((note) => (
        <NoteListItem
          note={note}
          vault={vault}
          key={note.path}
          pref={pref}
          action={action}
        />
      ))}
    </List>
  );
}
