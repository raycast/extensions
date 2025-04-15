import { Note } from "@hackmd/api/dist/type";
import { ReactElement, useMemo } from "react";
import { List } from "@raycast/api";
import NoteListItem from "./NoteListItem";

const sortByLastChanged = (a: Note, b: Note) =>
  new Date(b.lastChangedAt).valueOf() - new Date(a.lastChangedAt).valueOf();

const sortCategoryByLastChanged = (a: [string, Note[]], b: [string, Note[]]) => {
  const [aCategory, aNotes] = a;
  const [bCategory, bNotes] = b;

  if (aCategory === "No Category") {
    return -1;
  } else if (bCategory === "No Category") {
    return 1;
  }

  return sortByLastChanged(aNotes[0], bNotes[0]);
};

export default function NotesList({
  notes,
  isLoading,
  mutate,
  searchBarAccessory,
  sortByCategory,
}: {
  notes?: Note[];
  mutate?: () => void;
  isLoading: boolean;
  searchBarAccessory?: ReactElement<List.Dropdown.Props>;
  sortByCategory?: boolean;
}) {
  const groupedNotesByCategory = useMemo(() => {
    if (!notes) {
      return [];
    }

    const groupedNotes = notes.sort(sortByLastChanged).reduce(
      (acc, note) => {
        const category = (note.tags?.length > 0 && Array.isArray(note.tags) && note.tags[0]) || "No Category";

        if (!acc[category]) {
          acc[category] = [note];
        } else {
          acc[category].push(note);
        }

        return acc;
      },
      {} as Record<string, Note[]>,
    );

    return Object.entries(groupedNotes).sort(sortCategoryByLastChanged);
  }, [notes]);

  return (
    <List isLoading={isLoading} searchBarAccessory={searchBarAccessory}>
      {!sortByCategory &&
        notes?.sort(sortByLastChanged).map((note) => <NoteListItem note={note} key={note.id} mutate={mutate} />)}

      {sortByCategory &&
        groupedNotesByCategory.map(([category, notes]) => (
          <List.Section key={category} title={category}>
            {notes.map((note) => (
              <NoteListItem note={note} key={note.id} mutate={mutate} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
