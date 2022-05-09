import { List, ActionPanel, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";

import { Note, SearchNotePreferences } from "../utils/interfaces";
import { OpenNoteActions, NoteActions } from "../utils/actions";
import { getNoteContent } from "../utils/utils";
import { isNotePinned } from "../utils/PinNoteUtils";

export function NoteListItem(props: { note: Note; vaultPath: string; key: number }) {
  const note = props.note;
  const [pinned, setPinned] = useState(isNotePinned(note, props.vaultPath));

  const pin = function () {
    setPinned(!pinned);
  };

  return (
    <List.Item
      title={note.title}
      accessories={[{ text: pinned ? "⭐️" : "" }]}
      detail={<List.Item.Detail markdown={getNoteContent(note)} />}
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
}) {
  const notes = props.notes;
  const action = props.action;

  let isLoading = notes === undefined;

  if (notes !== undefined) {
    isLoading = notes.length == 0;
  }

  if (props.isLoading !== undefined) {
    isLoading = props.isLoading;
  }

  const pref: SearchNotePreferences = getPreferenceValues();

  return (
    <List isLoading={isLoading} isShowingDetail={pref.showDetail}>
      {notes?.map((note) => (
        <NoteListItem note={note} vaultPath={props.vaultPath} key={note.key} />
      ))}
    </List>
  );
}
