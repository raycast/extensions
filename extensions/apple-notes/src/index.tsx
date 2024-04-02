import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useNotes } from "./useNotes";
import NoteListItem from "./components/NoteListItem";
import { createNote } from "./api";

export default function Command() {
  const { data, isLoading, permissionView, mutate } = useNotes();

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title, folder, description, or accessories"
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Pinned">
        {data.pinnedNotes.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} />
        ))}
      </List.Section>

      <List.Section title="Notes">
        {data.unpinnedNotes.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} />
        ))}
      </List.Section>

      <List.Section title="Recently Deleted">
        {data.deletedNotes.map((note) => (
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
