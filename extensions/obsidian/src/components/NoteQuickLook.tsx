import { Action, ActionPanel, Icon } from "@raycast/api";
import { renewCache } from "../api/cache/cache.service";
import { Note } from "../api/vault/notes/notes.types";
import { filterContent } from "../api/vault/vault.service";
import { Vault } from "../api/vault/vault.types";
import { NoteActions, OpenNoteActions } from "../utils/actions";
import { NoteDetailWithCallouts } from "./NoteDetailWithCallouts";

export function NoteQuickLook(props: { showTitle: boolean; note: Note; vault: Vault; allNotes: Note[] }) {
  const { note, showTitle, allNotes, vault } = props;

  // Create a new note object with filtered content
  const filteredNote = {
    ...note,
    content: filterContent(note.content)
  };

  return (
    <NoteDetailWithCallouts
      note={filteredNote}
      vault={vault}
      isLoading={note === undefined}
      actions={
        <>
          <OpenNoteActions note={note} notes={allNotes} vault={vault} />
          <NoteActions notes={allNotes} note={note} vault={vault} />
          <Action title="Reload Notes" icon={Icon.ArrowClockwise} onAction={() => renewCache(vault)} />
        </>
      }
    />
  );
}
