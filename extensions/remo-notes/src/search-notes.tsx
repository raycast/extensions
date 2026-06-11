import { List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { NoteListItem } from "./components/NoteListItem";
import type { Note } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

export default function SearchNotes() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const fetchNotes = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      let result: Note[] = [];

      if (text.trim() === "") {
        result = await remoApi.recentNotes(20);
      } else {
        result = await remoApi.searchNotes(text);
      }

      const sortedResult = result.sort((a: Note, b: Note) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
      });
      setNotes(sortedResult);
    } catch (error) {
      handleError(error, "Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes(searchText);
  }, [searchText, fetchNotes]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes (text or semantic)..."
      throttle={true}
      isShowingDetail={isShowingDetail}
    >
      <List.EmptyView
        title={searchText ? "No results found" : "No notes found"}
        description={
          searchText ? "Try a different search term or check your spelling." : "You haven't added any notes yet."
        }
      />
      {notes.map((note) => (
        <NoteListItem
          key={note._id}
          note={note}
          onRefresh={() => fetchNotes(searchText)}
          isShowingDetail={isShowingDetail}
          onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
        />
      ))}
    </List>
  );
}
