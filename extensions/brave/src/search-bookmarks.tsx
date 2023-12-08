import type { ReactElement } from "react";
import { useEffect } from "react";

import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { BraveListItems } from "./components";
import BraveProfileDropDown from "./components/BraveProfileDropdown";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID, NoBookmarksText } from "./constants";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command(): ReactElement {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const { data, isLoading, revalidate } = useBookmarkSearch();

  useEffect(() => {
    revalidate?.(profile);
  }, [profile]);

  return (
    <List filtering={true} isLoading={isLoading} searchBarAccessory={<BraveProfileDropDown />}>
      <List.EmptyView title={NoBookmarksText} icon={{ source: "empty-view.png" }} />
      {data?.map((e) => <BraveListItems.TabHistory entry={e} key={e.id} profile={profile} />)}
    </List>
  );
}
