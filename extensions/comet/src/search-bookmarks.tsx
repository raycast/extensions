import { List } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { CometListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { useCachedState } from "@raycast/utils";
import {
  COMET_BOOKMARK_SORT_ORDER,
  COMET_PROFILE_KEY,
  DEFAULT_COMET_BOOKMARK_SORT_ORDER,
  DEFAULT_COMET_PROFILE_ID,
} from "./constants";
import { checkProfileConfiguration } from "./util";
import { BookmarkSortOrder } from "./interfaces";

export default function Command() {
  const [profileValid, setProfileValid] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [profile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);
  const [sortOrder] = useCachedState<BookmarkSortOrder>(COMET_BOOKMARK_SORT_ORDER, DEFAULT_COMET_BOOKMARK_SORT_ORDER);

  useEffect(() => {
    const checkProfile = async () => {
      const isValid = await checkProfileConfiguration();
      setProfileValid(isValid);
    };
    checkProfile();
  }, []);

  // Call hooks BEFORE any conditional returns
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText, profile);

  const sortedBookmarks = useMemo(
    () =>
      (data ?? []).sort((a, b) => {
        const bookmarkA = parseInt(a.dateAdded, 10);
        const bookmarkB = parseInt(b.dateAdded, 10);
        switch (sortOrder) {
          case "AddedAsc":
            return bookmarkA - bookmarkB;
          case "AddedDes":
            return bookmarkB - bookmarkA;
        }
      }),
    [data, sortOrder],
  );

  // If profile check is still pending, don't render anything
  if (profileValid === null) {
    return null;
  }

  // If profile is invalid, don't render anything (toast already shown)
  if (!profileValid) {
    return null;
  }

  if (errorView) {
    return errorView;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<CometProfileDropDown onProfileSelected={revalidate} />}
    >
      {sortedBookmarks.map((e) => (
        <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />
      ))}
    </List>
  );
}
