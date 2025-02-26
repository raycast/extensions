import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { createNote } from "./api/applescript";
import NoteListItem from "./components/NoteListItem";
import { useNotes } from "./hooks/useNotes";

export type NoteTitle = {
  title: string;
  uuid: string;
};

export default function Command() {
  const { data, isLoading, permissionView, mutate } = useNotes();
  const [searchText, setSearchText] = useState<string>("");

  if (permissionView) {
    return permissionView;
  }

  const filteredNotes = useMemo(() => {
    return [...(data?.pinnedNotes ?? []), ...(data?.unpinnedNotes ?? [])].filter(
      (note) =>
        note.title.toLowerCase().includes(searchText.toLowerCase()) ||
        note.snippet?.toLowerCase().includes(searchText.toLowerCase()) ||
        note.folder.toLowerCase().includes(searchText.toLowerCase()) ||
        note.tags.some((tag) => tag.text?.toLowerCase().includes(searchText.toLowerCase())),
    );
  }, [searchText, data]);

  // Limit the number of notes displayed (for example, to 100)
  const limitedNotes = filteredNotes.slice(0, 100);

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title, folder, description, tags, or accessories"
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Pinned">
        {limitedNotes
          .filter((note) => note.pinned)
          .map((note) => (
            <NoteListItem key={note.id} note={note} mutate={mutate} />
          ))}
      </List.Section>

      <List.Section title="Notes">
        {limitedNotes
          .filter((note) => !note.pinned)
          .map((note) => (
            <NoteListItem key={note.id} note={note} mutate={mutate} />
          ))}
      </List.Section>

      <List.Section title="Recently Deleted">
        {limitedNotes
          .filter((note) => note.folder === "Recently Deleted")
          .map((note) => (
            <NoteListItem key={note.id} note={note} mutate={mutate} isDeleted />
          ))}
      </List.Section>

      <List.EmptyView
        title="No notes were found"
        description="Create a new note by pressing ⏎"
        actions={
          <ActionPanel>
            <Action icon={Icon.Plus} title="Create New Note" onAction={() => createNote(searchText)} />
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
