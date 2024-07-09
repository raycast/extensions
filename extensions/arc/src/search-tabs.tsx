import { LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { useState } from "react";
import { getTabs } from "./arc";
import { TabListItem } from "./list";
import { TabLocation } from "./types";
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

  const orderedLocations = getOrderedLocations();
  const groupedTabs = groupBy(data, (tab) => tab.location);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<TabTypeDropdown tabTypes={tabTypes} onTabTypeChange={setTabsFilter} />}
    >
      {orderedLocations
        .filter((location) => tabsFilter === "all" || location === tabsFilter)
        .map((location) => {
          const tabs = groupedTabs[location];
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
