import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { renewCache } from "../api/cache/cache.service";
import { Note } from "../api/vault/notes/notes.types";
import { filterContent } from "../api/vault/vault.service";
import { Vault } from "../api/vault/vault.types";
import { NoteActions, OpenNoteActions } from "../utils/actions";

export function NoteQuickLook(props: { showTitle: boolean; note: Note; vault: Vault; allNotes: Note[] }) {
  const { note, showTitle, allNotes, vault } = props;

  return (
    <Detail
      isLoading={note === undefined}
      navigationTitle={showTitle ? note.title : ""}
      markdown={filterContent(note.content)}
      actions={
        <ActionPanel>
          <OpenNoteActions note={note} notes={allNotes} vault={vault} />
          <NoteActions notes={allNotes} note={note} vault={vault} />
          <Action title="Reload Notes" icon={Icon.ArrowClockwise} onAction={() => renewCache(vault)} />
        </ActionPanel>
      }
    />
  );
}
