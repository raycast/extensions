import { List } from "@raycast/api";
import { useNotes } from "../apis/note";
import NoteListItem from "./NoteListItem";

export default function CharacterNoteList({ characterId }: { characterId: number }) {
  const { data, isLoading } = useNotes(characterId);

  return (
    <List isLoading={isLoading}>
      {data?.list.map((note) => <NoteListItem key={`${note.characterId}-${note.noteId}`} note={note} />)}
    </List>
  );
}
