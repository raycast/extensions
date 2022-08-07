import { List, ActionPanel, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";

import { Note, Vault, SearchNotePreferences, SearchArguments } from "../utils/interfaces";
import {
  readingTime,
  wordCount,
  trimPath,
  createdDateFor,
  fileSizeFor,
  getNoteFileContent,
  filterContent,
} from "../utils/utils";
import { isNotePinned } from "../utils/pinNoteUtils";
import { NoteAction } from "../utils/constants";
import { deleteNoteFromCache, updateNoteInCache } from "../utils/cache";
import { tagsForNotes } from "../utils/yaml";

export function NoteListItem(props: {
  note: Note;
  vault: Vault;
  key: string;
  pref: SearchNotePreferences;
  onDelete: (note: Note) => void;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
}) {
  const { note, vault, pref, onDelete, action } = props;
  const [content, setContent] = useState(note.content);
  const [pinned, setPinned] = useState(isNotePinned(note, vault));

  function reloadContent() {
    const newContent = getNoteFileContent(note.path);
    note.content = newContent;
    setContent(newContent);
  }

  function reloadTags() {
    const newTags = tagsForNotes([note]);
    note.tags = newTags;
  }

  function actionCallback(action: NoteAction) {
    switch (+action) {
      case NoteAction.Pin:
        setPinned(!pinned);
        break;
      case NoteAction.Delete:
        onDelete(note);
        deleteNoteFromCache(vault, note);
        break;
      case NoteAction.Edit:
        reloadContent();
        reloadTags();
        updateNoteInCache(vault, note);
        break;
      case NoteAction.Append:
        reloadContent();
        reloadTags();
        updateNoteInCache(vault, note);
    }
  }

  return (
    <List.Item
      title={note.title}
      accessories={[{ text: pinned ? "⭐️" : "" }]}
      detail={
        <List.Item.Detail
          markdown={filterContent(content)}
          metadata={
            pref.showMetadata ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Character Count" text={content.length.toString()} />
                <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount(content).toString()} />
                <List.Item.Detail.Metadata.Label
                  title="Reading Time"
                  text={readingTime(content).toString() + " min read"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Creation Date"
                  text={createdDateFor(note).toLocaleDateString()}
                />
                <List.Item.Detail.Metadata.Label title="File Size" text={fileSizeFor(note).toFixed(2) + " KB"} />
                <List.Item.Detail.Metadata.Label
                  title="Note Path"
                  text={trimPath(note.path.split(vault.path)[1], 55)}
                />
              </List.Item.Detail.Metadata>
            ) : (
              <React.Fragment />
            )
          }
        />
      }
      actions={
        <ActionPanel>
          <React.Fragment>{action && action(note, vault, actionCallback)}</React.Fragment>
        </ActionPanel>
      }
    />
  );
}

export function NoteList(props: {
  notes: Note[] | undefined;
  allNotes?: Note[];
  setNotes?: (notes: Note[]) => void;
  tags?: string[];
  isLoading?: boolean;
  title?: string;
  vault: Vault;
  searchArguments: SearchArguments;
  action?: (note: Note, vault: Vault, actionCallback: (action: NoteAction) => void) => React.ReactFragment;
  onSearchChange: (search: string) => void;
  onDelete: (note: Note) => void;
}) {
  const { notes, allNotes, vault, isLoading, title, tags, searchArguments, action, onSearchChange, onDelete } = props;
  const pref = getPreferenceValues<SearchNotePreferences>();
  const { showDetail } = pref;

  let isNotesUndefined = notes === undefined;

  if (notes !== undefined) {
    isNotesUndefined = notes.length == 0;
  }

  if (isLoading !== undefined) {
    isNotesUndefined = isLoading;
  }

  function DropDownList() {
    if (props.setNotes && allNotes && tags) {
      return (
        <List.Dropdown
          tooltip="Search For"
          defaultValue={
            searchArguments.tagArgument.startsWith("#")
              ? searchArguments.tagArgument
              : "#" + searchArguments.tagArgument
          }
          onChange={(value) => {
            if (value != "all") {
              if (props.setNotes) {
                props.setNotes(allNotes.filter((note) => note.tags.includes(value)));
              }
            } else {
              if (props.setNotes) {
                props.setNotes(allNotes);
              }
            }
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Section title="Tags" />
          {tags.map((tag) => (
            <List.Dropdown.Item title={tag} value={tag} key={tag} />
          ))}
        </List.Dropdown>
      );
    } else {
      return <React.Fragment />;
    }
  }

  return (
    <List
      isLoading={isNotesUndefined}
      isShowingDetail={showDetail}
      onSearchTextChange={onSearchChange}
      navigationTitle={title}
      searchText={searchArguments.searchArgument}
      searchBarAccessory={<DropDownList />}
    >
      {notes?.map((note) => (
        <NoteListItem note={note} vault={vault} key={note.path} pref={pref} onDelete={onDelete} action={action} />
      ))}
    </List>
  );
}
