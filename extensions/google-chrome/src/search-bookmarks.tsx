import { List } from "@raycast/api";
import { useState } from "react";
import { ChromeListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<ChromeProfileDropDown onProfileSelected={revalidate} />}
    >
      {data?.map((e) => (
        <ChromeListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />
      ))}
    </List>
  );
}
