import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { EdgeListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import EdgeProfileDropDown from "./components/EdgeProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { DEFAULT_PROFILE_ID } from "./constants";
import { getCurrentProfileCacheKey } from "./utils/appUtils";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(getCurrentProfileCacheKey(), DEFAULT_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<EdgeProfileDropDown onProfileSelected={revalidate} />}
    >
      {data?.map((e) => (
        <EdgeListItems.TabHistory key={e.id} entry={e} profile={profile} />
      ))}
    </List>
  );
}
