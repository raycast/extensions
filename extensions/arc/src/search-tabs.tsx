import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { getTabs } from "./arc";
import { TabListItem } from "./list";
import { getKey, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";
import { VersionCheck } from "./version";

function SearchTabs() {
  const { data, isLoading, mutate } = useCachedPromise(getTabs);

  const orderedLocations = getOrderedLocations();
  const groupedTabs = groupBy(data, (tab) => tab.location);

  return (
    <List isLoading={isLoading} filtering={{ keepSectionOrder: true }}>
      {orderedLocations.map((location) => {
        const tabs = groupedTabs[location];
        return (
          <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
            {tabs?.map((tab) => (
              <TabListItem key={getKey(tab)} tab={tab} mutate={mutate} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchTabs />
    </VersionCheck>
  );
}
