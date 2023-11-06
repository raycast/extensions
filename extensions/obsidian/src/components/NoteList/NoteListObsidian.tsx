import React, { useReducer } from "react";

import { useNotes } from "../../utils/hooks";
import { Note, Vault, SearchArguments } from "../../utils/interfaces";
import { NoteList } from "./NoteList";
import { NoteActions, OpenNoteActions } from "../../utils/actions";
import { NoteReducer } from "../../utils/data/reducers";
import { NotesContext, NotesDispatchContext } from "../../utils/utils";
import { Action, Icon } from "@raycast/api";
import { renewCache } from "../../utils/data/cache";

export function NoteListObsidian(props: {
  vault: Vault;
  showTitle: boolean;
  bookmarked: boolean;
  searchArguments: SearchArguments;
}) {
  const { showTitle, vault, searchArguments } = props;

  const [allNotes] = useNotes(vault, props.bookmarked);
  const [currentViewNoteList, dispatch] = useReducer(NoteReducer, allNotes);

  return (
    <NotesContext.Provider value={allNotes}>
      <NotesDispatchContext.Provider value={dispatch}>
        <NoteList
          title={showTitle ? `Search Note in ${vault.name}` : ""}
          notes={currentViewNoteList}
          vault={vault}
          searchArguments={searchArguments}
          action={(note: Note, vault: Vault) => {
            return (
              <React.Fragment>
                <OpenNoteActions note={note} notes={allNotes} vault={vault} />
                <NoteActions notes={allNotes} note={note} vault={vault} />
                <Action title="Reload Notes" icon={Icon.ArrowClockwise} onAction={() => renewCache(vault)}></Action>
              </React.Fragment>
            );
          }}
        />
      </NotesDispatchContext.Provider>
    </NotesContext.Provider>
  );
}
