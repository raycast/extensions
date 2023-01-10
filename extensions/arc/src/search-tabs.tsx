import { List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import Actions from "./actions";
import { getTabs } from "./arc";
import { getDomain, getKey, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";

export default function Command() {
  const { data, isLoading } = useCachedPromise(getTabs);

  const orderedLocations = getOrderedLocations();
  const groupedTabs = groupBy(data, (tab) => tab.location);

  return (
    <List isLoading={isLoading}>
      {orderedLocations.map((location) => {
        const tabs = groupedTabs[location];
        return (
          <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
            {tabs.map((tab) => (
              <List.Item
                key={getKey(tab)}
                icon={getFavicon(tab.url)}
                title={tab.title}
                subtitle={getDomain(tab.url)}
                actions={<Actions url={tab.url} title={tab.title} />}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
