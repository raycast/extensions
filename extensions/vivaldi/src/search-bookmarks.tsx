import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { VivaldiListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { useCachedState } from "@raycast/utils";
import { VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID } from "./constants";
import VivaldiProfileDropDown from "./components/VivaldiProfileDropdown";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState(VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID);
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView as ReactElement;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={<VivaldiProfileDropDown onProfileSelected={revalidate} />}
    >
      {data?.map((e) => (
        <VivaldiListItems.TabHistory entry={e} key={e.id} profile={profile} />
      ))}
    </List>
  );
}
