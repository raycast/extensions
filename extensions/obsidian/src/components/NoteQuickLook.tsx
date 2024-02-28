import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Note, Vault } from "../utils/interfaces";
import { filterContent } from "../utils/utils";
import { NoteActions, OpenNoteActions } from "../utils/actions";
import { renewCache } from "../utils/data/cache";

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
