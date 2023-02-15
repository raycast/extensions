import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { BraveListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "./constants";
import BraveProfileDropDown from "./components/BraveProfileDropdown";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<BraveProfileDropDown onProfileSelected={revalidate} />}
    >
      {data?.map((e) => (
        <BraveListItems.TabHistory entry={e} key={e.id} profile={profile} />
      ))}
    </List>
  );
}
