import { List } from "@raycast/api";
import { useNotes } from "./useNotes";
import { partition } from "lodash";
import NoteListItem from "./components/NoteListItem";

export default function Command() {
  const { data, isLoading, permissionView, mutate } = useNotes();

  if (permissionView) {
    return permissionView;
  }

  const alreadyFound: { [key: string]: boolean } = {};
  const notes =
    data
      ?.filter((x) => {
        const found = alreadyFound[x.id];
        if (!found) alreadyFound[x.id] = true;
        return !found;
      })
      .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1)) ?? [];

  const [activeNotes, deletedNotes] = partition(notes, (note) => note.folder != "Recently Deleted");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes by title, folder, or description">
      {activeNotes.map((note) => (
        <NoteListItem key={note.id} note={note} mutate={mutate} />
      ))}

      <List.Section title="Recently Deleted">
        {deletedNotes.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} isDeleted />
        ))}
      </List.Section>
    </List>
  );
}
