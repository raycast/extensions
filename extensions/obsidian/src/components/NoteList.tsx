import { List, ActionPanel, getPreferenceValues } from "@raycast/api";
import React from "react";

import { Note, SearchNotePreferences } from "../utils/interfaces";
import { OpenNoteActions, NoteActions } from "../utils/actions";
import { getNoteContent } from "../utils/utils";

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
        <List.Item
          title={note.title}
          key={note.key}
          detail={<List.Item.Detail markdown={getNoteContent(note)} />}
          actions={
            <ActionPanel>
              <OpenNoteActions note={note} vaultPath={props.vaultPath} />
              <NoteActions note={note} vaultPath={props.vaultPath} />
              {/* {action && action(note)} */}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
