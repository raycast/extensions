import { LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { useState, useMemo } from "react";
import Fuse from "fuse.js"; // Add this import
import { pinyin } from "pinyin-pro";
import { getTabs } from "./arc";
import { TabListItem } from "./list";
import { TabLocation, Tab } from "./types";
import { getKey, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";
import { VersionCheck } from "./version";

type tabType = {
  id: number;
  name: "All Tabs" | "Favorites" | "Pinned" | "Unpinned";
  value: "all" | TabLocation;
};

function TabTypeDropdown(props: { tabTypes: tabType[]; onTabTypeChange: (newValue: string) => void }) {
  const { tabTypes, onTabTypeChange } = props;

  return (
    <List.Dropdown
      tooltip="Filter tabs by tab type"
      defaultValue="All"
      storeValue={true}
      onChange={(newValue) => {
        onTabTypeChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Tabs Shown">
        {tabTypes.map((tabType) => (
          <List.Dropdown.Item key={tabType.id} title={tabType.name} value={tabType.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// Enhanced Tab type with pinyin
interface EnhancedTab extends Tab {
  titlePinyin: string;
}

// Helper function to convert text to pinyin
function toPinyin(text: string): string {
  return pinyin(text, {
    toneType: "none",
  }).replace(/\s+/g, "");
}

function SearchTabs(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [tabsFilter, setTabsFilter] = useState("unpinned");
  const tabTypes: tabType[] = [
    { id: 0, name: "All Tabs", value: "all" },
    { id: 1, name: "Favorites", value: "topApp" },
    { id: 2, name: "Pinned", value: "pinned" },
    { id: 3, name: "Unpinned", value: "unpinned" },
  ];
  const { data, isLoading, mutate } = useCachedPromise(getTabs);
  const newData = useMemo(() => {
    return data?.map((tab) => ({
      ...tab,
      titlePinyin: toPinyin(tab.title),
    }));
  }, [data]);
  // const newData = data;

  const orderedLocations = getOrderedLocations();

  // Configure Fuse options
  const fuseOptions = {
    keys: [
      { name: "title", weight: 0.2 },
      { name: "titlePinyin", weight: 0.3 },
      { name: "url", weight: 0.5 },
    ],
    threshold: 0.3, // Adjust this value to control fuzzy matching sensitivity (0.0 = exact match, 1.0 = match anything)
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 1,
    // Optional advanced settings
    distance: 100,
    useExtendedSearch: true,
    ignoreLocation: true,
  };

  // Custom filtering function with fuzzy search
  const filterTabs = (tabs: EnhancedTab[] | undefined, searchText: string, tabsFilter: string) => {
    if (!tabs) return {};

    let filteredTabs: EnhancedTab[];

    if (searchText.trim() === "") {
      // If no search text, just filter by tab type
      filteredTabs = tabs.filter((tab) => tabsFilter === "all" || tab.location === tabsFilter);
    } else {
      // Create Fuse instance for fuzzy search
      const fuse = new Fuse(tabs, fuseOptions);

      // Perform fuzzy search
      const searchResults = fuse.search(searchText);

      // Filter results by tab type
      filteredTabs = searchResults
        .map((result) => result.item)
        .filter((tab) => tabsFilter === "all" || tab.location === tabsFilter);
    }

    return groupBy(filteredTabs, (tab) => tab.location);
  };

  // Use useMemo to optimize performance
  const filteredGroupedTabs = useMemo(
    () => filterTabs(newData, searchText, tabsFilter),
    [data, searchText, tabsFilter],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<TabTypeDropdown tabTypes={tabTypes} onTabTypeChange={setTabsFilter} />}
    >
      {orderedLocations
        .filter((location) => filteredGroupedTabs[location])
        .map((location) => {
          const tabs = filteredGroupedTabs[location];
          return (
            <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
              {tabs?.map((tab) => <TabListItem key={getKey(tab)} tab={tab} searchText={searchText} mutate={mutate} />)}
            </List.Section>
          );
        })}
    </List>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchTabs {...props} />
    </VersionCheck>
  );
}
