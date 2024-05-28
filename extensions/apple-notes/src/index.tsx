import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { createNote } from "./api";
import NoteListItem from "./components/NoteListItem";
import { useNotes } from "./useNotes";

export type NoteTitle = {
  title: string;
  uuid: string;
};

export default function Command() {
  const { data, isLoading, permissionView, mutate } = useNotes();

  if (permissionView) {
    return permissionView;
  }

  const noteTitles = [...(data?.pinnedNotes ?? []), ...(data?.unpinnedNotes ?? [])].map((note) => ({
    title: note.title,
    uuid: note.UUID,
  }));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title, folder, description, tags, or accessories"
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Pinned">
        {data.pinnedNotes.map((note) => (
          <NoteListItem noteTitles={noteTitles} key={note.id} note={note} mutate={mutate} />
        ))}
      </List.Section>

      <List.Section title="Notes">
        {data.unpinnedNotes.map((note) => (
          <NoteListItem noteTitles={noteTitles} key={note.id} note={note} mutate={mutate} />
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
