import { Note, ObsidianVault } from "@/obsidian";
import { ActionPanel, Detail } from "@raycast/api";
import { NoteActions, OpenNoteActions } from "../utils/actions";
import { useNoteContent } from "../utils/hooks";
import { filterContent } from "../utils/utils";

export function NoteQuickLook(props: { showTitle: boolean; note: Note; vault: ObsidianVault }) {
  const { note, showTitle, vault } = props;
  const { noteContent, isLoading } = useNoteContent(note);

  const markdownContent = noteContent === null ? "Failed to load note content." : filterContent(noteContent);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={showTitle ? note.title : ""}
      markdown={markdownContent}
      actions={
        noteContent !== null ? (
          <ActionPanel>
            <OpenNoteActions note={{ content: noteContent, ...note }} vault={vault} showQuickLook={false} />
            <NoteActions note={{ content: noteContent, ...note }} vault={vault} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
