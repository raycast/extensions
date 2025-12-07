import React, { useReducer } from "react";

import {
  NotesContext,
  NotesDispatchContext,
  useNotes,
} from "../../utils/hooks";
import { SearchArguments } from "../../utils/interfaces";
import { NoteList } from "./NoteList";
import { NoteActions, OpenNoteActions } from "../../utils/actions";
import { NoteReducer } from "../../utils/reducers";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { Vault } from "../../api/vault/vault.types";
import { Note } from "../../api/vault/notes/notes.types";
import { renewCache } from "../../api/cache/cache.service";

export function NoteListObsidian(props: {
  vault: Vault;
  showTitle: boolean;
  bookmarked: boolean;
  searchArguments: SearchArguments;
  onSwitchVault?: () => void;
}) {
  const { showTitle, vault, searchArguments, onSwitchVault } = props;

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
                <ActionPanel.Section>
                  <Action
                    title="Reload Notes"
                    icon={Icon.ArrowClockwise}
                    onAction={() => renewCache(vault)}
                  />
                  {onSwitchVault && (
                    <Action
                      title="Switch Vault"
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                      onAction={onSwitchVault}
                    />
                  )}
                </ActionPanel.Section>
              </React.Fragment>
            );
          }}
        />
      </NotesDispatchContext.Provider>
    </NotesContext.Provider>
  );
}
