import { List } from "@raycast/api";
import { useState } from "react";
import { CometListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText, profile);

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
      {data?.map((e) => (
        <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />
      ))}
    </List>
  );
}
