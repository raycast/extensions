import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { NoteSections } from "./components/NoteSections";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

export default function SearchNotes() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const isSearching = searchText.trim() !== "";

  const { isLoading, data, revalidate, mutate } = useCachedPromise(
    async (text: string) => {
      return text.trim() === "" ? await remoApi.recentNotes(20) : await remoApi.searchNotes(text);
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: (error) => handleError(error, "Failed to fetch notes"),
    },
  );

  const { data: folders } = useCachedPromise(() => remoApi.listFolders(), []);

  const notes = data ?? [];

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
      <NoteSections
        notes={notes}
        onRefresh={revalidate}
        mutate={mutate}
        folders={folders}
        isShowingDetail={isShowingDetail}
        onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
        othersTitle="Recent"
        groupPinned={!isSearching}
      />
    </List>
  );
}
