import { ObsidianVault } from "@/obsidian";
import { useNotes } from "../../utils/hooks";
import { SearchArguments } from "../../utils/interfaces";
import { NoteList } from "./NoteList";

export const NoteListObsidian = function NoteListObsidian(props: {
  vault: ObsidianVault;
  showTitle: boolean;
  bookmarked: boolean;
  searchArguments: SearchArguments;
}) {
  const { showTitle, vault, searchArguments, bookmarked } = props;

  const { notes, loading, updateNote, deleteNote } = useNotes(vault, bookmarked);

  return (
    <NoteList
      title={showTitle ? `Search Note in ${vault.name}` : ""}
      notes={notes}
      vault={vault}
      searchArguments={searchArguments}
      isLoading={loading}
      onNoteUpdated={updateNote}
      onDelete={(note) => deleteNote(note.path)}
    />
  );
};
