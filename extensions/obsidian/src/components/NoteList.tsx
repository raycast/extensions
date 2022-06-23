import { List, ActionPanel, getPreferenceValues, preferences } from "@raycast/api";
import React, { useState } from "react";

import { Note, SearchNotePreferences } from "../utils/interfaces";
import { OpenNoteActions, NoteActions } from "../utils/actions";
import { readingTime, wordCount, trimPath, createdDateFor, fileSizeFor } from "../utils/utils";
import { isNotePinned } from "../utils/PinNoteUtils";

export function NoteListItem(props: { note: Note; vaultPath: string; key: number; pref: SearchNotePreferences }) {
  const note = props.note;
  const [pinned, setPinned] = useState(isNotePinned(note, props.vaultPath));

  const pin = function () {
    setPinned(!pinned);
  };

  return (
    <List.Item
      title={note.title}
      accessories={[{ text: pinned ? "⭐️" : "" }]}
      detail={
        <List.Item.Detail
          markdown={note.content}
          metadata={
            props.pref.showMetadata ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Character Count" text={note.content.length.toString()} />
                <List.Item.Detail.Metadata.Label title="Word Count" text={wordCount(note.content).toString()} />
                <List.Item.Detail.Metadata.Label
                  title="Reading Time"
                  text={readingTime(note.content).toString() + " min read"}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Creation Date"
                  text={createdDateFor(note).toLocaleDateString()}
                />
                <List.Item.Detail.Metadata.Label title="File Size" text={fileSizeFor(note).toFixed(2) + " KB"} />
                <List.Item.Detail.Metadata.Label
                  title="Note Path"
                  text={trimPath(note.path.split(props.vaultPath)[1], 55)}
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
          <OpenNoteActions note={note} vaultPath={props.vaultPath} />
          <NoteActions note={note} vaultPath={props.vaultPath} onPin={pin} />
          {/* {action && action(note)} */}
        </ActionPanel>
      }
    />
  );
}

export function NoteList(props: {
  notes: Note[] | undefined;
  action?: (note: Note) => React.ReactFragment;
  isLoading?: boolean;
  vaultPath: string;
  onSearchChange: (search: string) => void;
}) {
  const notes = props.notes;
  const action = props.action;
  const pref: SearchNotePreferences = getPreferenceValues();

  let isLoading = notes === undefined;

  if (notes !== undefined) {
    isLoading = notes.length == 0;
  }

  if (props.isLoading !== undefined) {
    isLoading = props.isLoading;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={pref.showDetail} onSearchTextChange={props.onSearchChange}>
      {notes?.map((note) => (
        <NoteListItem note={note} vaultPath={props.vaultPath} key={note.key} pref={pref} />
      ))}
    </List>
  );
}
