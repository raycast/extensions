import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { IridiumListsItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import IridiumProfileDropDown from "./components/IridiumProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { IRIDIUM_PROFILE_KEY, DEFAULT_IRIDIUM_PROFILE_ID } from "./constants";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(IRIDIUM_PROFILE_KEY, DEFAULT_IRIDIUM_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<IridiumProfileDropDown onProfileSelected={revalidate} />}
    >
      {data?.map((e) => (
        <IridiumListsItems.TabHistory entry={e} key={e.id} profile={profile} />
      ))}
    </List>
  );
}
