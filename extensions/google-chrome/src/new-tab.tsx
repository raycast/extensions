import { useState, ReactNode, useEffect } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ChromeActions, ChromeListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { useCachedState } from "@raycast/utils";
import { ChromeProfile, HistoryEntry, Preferences, SearchResult } from "./interfaces";
import ChromeProfileDropDown from "./components/ChromeProfileDropdown";
import { CHROME_PROFILE_KEY, CHROME_PROFILES_KEY, DEFAULT_CHROME_PROFILE_ID } from "./constants";
import { classifyInput, ClassifiedInput } from "./util/classify-input";

type HistoryContainer = {
  profile: ChromeProfile;
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
  const [searchText, setSearchText] = useState<string>();
  const [profiles] = useCachedState<ChromeProfile[]>(CHROME_PROFILES_KEY);
  const [profile] = useCachedState(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const [profileHistories, setProfileHistories] = useState<HistoryContainer[]>([]);

  const currentProfileHistory = useHistorySearch(profile, searchText);
  const { data: dataTab, isLoading: isLoadingTab, errorView: errorViewTab } = useTabSearch();
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (profiles && profile) {
      const currentProfile = profiles.find((p) => p?.id === profile);
      if (currentProfile && currentProfileHistory) {
        setProfileHistories([
          {
            data: currentProfileHistory.data,
            isLoading: currentProfileHistory.isLoading,
            errorView: currentProfileHistory.errorView,
            revalidate: currentProfileHistory.revalidate,
            profile: currentProfile,
          },
        ]);
      } else if (!currentProfileHistory || !currentProfile) {
        setProfileHistories([]);
      }
    }
  }, [profiles, profile, currentProfileHistory]);

  if (errorViewTab || profileHistories?.some((p) => p.errorView)) {
    const errorViewHistory = profileHistories?.find((p) => p.errorView)?.errorView;
    return errorViewTab || errorViewHistory;
  }

  const classifiedInput: ClassifiedInput = classifyInput(searchText || "");
  let actionTitle: string;
  let actions: ReactNode;
  let icon: Icon;

  if (!classifiedInput.value) {
    actionTitle = "Open Empty Tab";
    icon = Icon.Plus;
    actions = <ChromeActions.NewTab />;
  } else if (classifiedInput.type === "url") {
    actionTitle = `Open URL "${searchText}"`;
    icon = Icon.Globe;
    actions = <ChromeActions.NewTab url={classifiedInput.value} />;
  } else {
    actionTitle = `Search "${searchText}"`;
    icon = Icon.MagnifyingGlass;
    actions = <ChromeActions.NewTab query={searchText} />;
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoadingTab || profileHistories?.find((p) => p.isLoading)?.isLoading}
      searchBarAccessory={<ChromeProfileDropDown />}
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item title={actionTitle} icon={icon} actions={<>{actions}</>} />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {dataTab?.map((tab) => (
          <ChromeListItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      {orderByLastVisited(profile, profileHistories)
        .filter((p) => p?.profile?.id)
        .map((p) => (
          <List.Section key={p.profile.id} title={`History - ${p.profile.name}`}>
            {p.data?.map((e) => (
              <ChromeListItems.TabHistory
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
