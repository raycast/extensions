import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { match } from "pinyin-pro";
import { useMemo, useCallback, useState } from "react";

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

  const filterNote = useCallback(
    (note: ReturnType<typeof useNotes>["data"]["pinnedNotes"][number]) => {
      const chineseMatch = (text: string | null) =>
        text && /[\u4e00-\u9fa5]/.test(text) ? match(text, searchText) !== null : false;
      return (
        chineseMatch(note.title) ||
        chineseMatch(note.snippet) ||
        chineseMatch(note.folder) ||
        note.tags.some((tag) => chineseMatch(tag.text)) ||
        note.title.toLowerCase().includes(searchText.toLowerCase()) ||
        note.snippet?.toLowerCase().includes(searchText.toLowerCase()) ||
        note.folder.toLowerCase().includes(searchText.toLowerCase()) ||
        note.tags.some((tag) => tag.text?.toLowerCase().includes(searchText.toLowerCase()))
      );
    },
    [searchText],
  );

  const filteredPinned = useMemo(() => (data?.pinnedNotes ?? []).filter(filterNote), [filterNote, data]);
  const filteredUnpinned = useMemo(() => (data?.unpinnedNotes ?? []).filter(filterNote), [filterNote, data]);
  const filteredDeleted = useMemo(() => (data?.deletedNotes ?? []).filter(filterNote), [filterNote, data]);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder="Search notes by title, folder, description, tags, or accessories"
    >
      <List.Section title="Pinned">
        {filteredPinned.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} />
        ))}
      </List.Section>

      <List.Section title="Notes">
        {filteredUnpinned.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} />
        ))}
      </List.Section>

      <List.Section title="Recently Deleted">
        {filteredDeleted.map((note) => (
          <NoteListItem key={note.id} note={note} mutate={mutate} isDeleted />
        ))}
      </List.Section>

      <List.EmptyView
        title="No notes were found"
        description="Create a new note by pressing ⏎"
        actions={
          <ActionPanel>
            <Action icon={Icon.Plus} title="Create New Note" onAction={async () => await createNote(searchText)} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => await mutate()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
