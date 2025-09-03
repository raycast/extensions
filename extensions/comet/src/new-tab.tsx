import { useState, ReactNode, useMemo, useEffect } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { CometActions, CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { useCachedState } from "@raycast/utils";
import { CometProfile, HistoryEntry, Preferences, SearchResult } from "./interfaces";
import CometProfileDropDown from "./components/CometProfileDropdown";
import { COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID } from "./constants";
import { checkProfileConfiguration } from "./util";

type HistoryContainer = {
  profile: CometProfile;
} & SearchResult<HistoryEntry>;

function orderByLastVisited(targetId: string, container?: HistoryContainer[]): HistoryContainer[] {
  if (!container || container.length === 0) {
    return [];
  }

  const elementIndex = container.findIndex((e) => e?.profile?.id === targetId);
  if (elementIndex > 0) {
    const [foundElement] = container.splice(elementIndex, 1);
    container.unshift(foundElement);
  }
  return container;
}

export default function Command() {
  // All simple hooks first
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  // Then state hooks
  const [profileValid, setProfileValid] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState("");
  const [profiles] = useCachedState<CometProfile[]>("COMET_PROFILES", []);
  const [profile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);

  useEffect(() => {
    const checkProfile = async () => {
      const isValid = await checkProfileConfiguration();
      setProfileValid(isValid);
    };
    checkProfile();
  }, []);

  // Finally custom hooks - MUST be called before any conditional returns
  // Always call with enabled=true to maintain hook consistency, filter results later
  const currentProfileHistory = useHistorySearch(profile, searchText, true);
  const { data: dataTab, isLoading: isLoadingTab, errorView: errorViewTab } = useTabSearch();

  // Use useMemo to calculate profileHistories to avoid infinite re-renders
  // This MUST be called before any conditional returns
  const profileHistories = useMemo<HistoryContainer[]>(() => {
    if (!profiles || !profile || !currentProfileHistory) {
      return [];
    }

    const currentProfile = profiles.find((p) => p?.id === profile);
    if (!currentProfile) {
      return [];
    }

    return [
      {
        data: currentProfileHistory.data,
        isLoading: currentProfileHistory.isLoading,
        errorView: currentProfileHistory.errorView,
        revalidate:
          currentProfileHistory.revalidate ||
          (() => {
            /* no-op */
          }),
        profile: currentProfile,
      },
    ];
  }, [profiles, profile, currentProfileHistory]);

  // If profile check is still pending, don't render anything
  if (profileValid === null) {
    return null;
  }

  // If profile is invalid, don't render anything (toast already shown)
  if (!profileValid) {
    return null;
  }

  // Simple URL detection function
  const isUrl = (text: string): boolean => {
    // Check for common URL patterns
    const urlPattern = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
    return urlPattern.test(text.trim());
  };

  let actionTitle: string;
  let actions: ReactNode;
  let icon: Icon;

  if (!searchText || searchText.trim() === "") {
    actionTitle = "Open Empty Tab";
    icon = Icon.Plus;
    actions = <CometActions.NewTab />;
  } else if (isUrl(searchText)) {
    // Add protocol if missing
    const url = searchText.startsWith("http") ? searchText : `https://${searchText}`;
    actionTitle = `Open "${searchText}"`;
    icon = Icon.Globe;
    actions = <CometActions.NewTab url={url} />;
  } else {
    actionTitle = `Search "${searchText}" with Perplexity`;
    icon = Icon.MagnifyingGlass;
    actions = <CometActions.NewTab query={searchText} />;
  }

  // Check for errors after all hooks have been called
  if (errorViewTab || profileHistories?.some((p) => p.errorView)) {
    const errorViewHistory = profileHistories?.find((p) => p.errorView)?.errorView;
    return errorViewTab || errorViewHistory;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoadingTab || profileHistories?.find((p) => p.isLoading)?.isLoading}
      searchBarAccessory={<CometProfileDropDown />}
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item title={actionTitle} icon={icon} actions={actions} />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {dataTab?.map((tab) => (
          <CometListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      {orderByLastVisited(profile, profileHistories)
        .filter((p) => p?.profile?.id)
        .map((p) => (
          <List.Section key={p.profile.id} title={`History - ${p.profile.name}`}>
            {p.data?.map((e) => (
              <CometListItems.TabHistory
                key={`${p.profile.id}-${e.id}`}
                entry={e}
                profile={p.profile.id}
                type="History"
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
