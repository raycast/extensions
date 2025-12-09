import { List } from "@raycast/api";
import { ReactElement, useEffect, useState, useMemo } from "react";
import { BraveListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID, NoBookmarksText } from "./constants";
import BraveProfileDropDown from "./components/BraveProfileDropdown";
import { filterAndSortEntries } from "./util";

export default function Command(): ReactElement {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const { data, isLoading, revalidate } = useBookmarkSearch();
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    revalidate?.(profile);
  }, [profile]);

  const filteredData = useMemo(() => filterAndSortEntries(data || [], searchText), [data, searchText]);

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      searchBarAccessory={<BraveProfileDropDown />}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title={NoBookmarksText} icon={{ source: "empty-view.png" }} />
      {filteredData?.map((e) => (
        <BraveListItems.TabHistory entry={e} key={e.id} profile={profile} />
      ))}
    </List>
  );
}
