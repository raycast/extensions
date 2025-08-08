import { List } from "@raycast/api";
import { useState } from "react";
import { CometListItems } from "./components";
import { useCachedState, useCachedPromise } from "@raycast/utils";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { getBookmarks } from "./util";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [profile] = useCachedState(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);

  const { data, isLoading } = useCachedPromise(
    async () => {
      const bookmarks = await getBookmarks();
      if (searchText) {
        return bookmarks.filter(
          (bookmark) =>
            bookmark.title.toLowerCase().includes(searchText.toLowerCase()) ||
            bookmark.url.toLowerCase().includes(searchText.toLowerCase()),
        );
      }
      return bookmarks;
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {data?.map((e) => (
        <CometListItems.TabHistory
          key={e.id}
          entry={e}
          profile={profile}
          type="Bookmark"
        />
      ))}
      {data?.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Bookmarks Found"
          description="Add some bookmarks to Comet browser to see them here."
        />
      )}
    </List>
  );
}
