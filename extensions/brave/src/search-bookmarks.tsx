import { List } from "@raycast/api";
import { ReactElement, useEffect } from "react";
import { BraveListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { useCachedState } from "@raycast/utils";
import { BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID, NoBookmarksText } from "./constants";
import BraveProfileDropDown from "./components/BraveProfileDropdown";

export default function Command(): ReactElement {
  const [profile] = useCachedState(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const { data, isLoading, revalidate } = useBookmarkSearch();

  useEffect(() => {
    revalidate?.(profile);
  }, [profile]);

  return (
    <List filtering={true} isLoading={isLoading} searchBarAccessory={<BraveProfileDropDown />}>
      <List.EmptyView title={NoBookmarksText} icon={{ source: "empty-view.png" }} />
      {data?.map((e) => (
        <BraveListItems.TabHistory entry={e} key={e.id} profile={profile} />
      ))}
    </List>
  );
}
