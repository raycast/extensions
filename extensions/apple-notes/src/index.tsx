import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useNotes } from "./useNotes";
import { partition } from "lodash";
import NoteListItem from "./components/NoteListItem";
import { createNote } from "./api";

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

      <List.EmptyView
        title="No notes were found"
        description="Create a new note by pressing ⏎"
        actions={
          <ActionPanel>
            <Action icon={Icon.Plus} title="Create New Note" onAction={createNote} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => mutate()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
