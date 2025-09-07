import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { CometListItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { useCachedState } from "@raycast/utils";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { checkProfileConfiguration } from "./util";

export default function Command() {
  const [profileValid, setProfileValid] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [profile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);

  useEffect(() => {
    const checkProfile = async () => {
      const isValid = await checkProfileConfiguration();
      setProfileValid(isValid);
    };
    checkProfile();
  }, []);

  // Call hooks BEFORE any conditional returns
  const { data, isLoading, errorView, revalidate } = useBookmarkSearch(searchText, profile);

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
      {data?.map((e) => (
        <CometListItems.TabHistory key={e.id} entry={e} profile={profile} type="Bookmark" />
      ))}
    </List>
  );
}
