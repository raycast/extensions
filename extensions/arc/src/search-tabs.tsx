import { ActionPanel, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { CopyLinkActionSection, EditTabActionSection, OpenLinkActionSections } from "./actions";
import { getTabs } from "./arc";
import { getDomain, getKey, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";

export default function Command() {
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
              <List.Item
                key={getKey(tab)}
                icon={getFavicon(tab.url)}
                title={tab.title}
                subtitle={getDomain(tab.url)}
                actions={
                  <ActionPanel>
                    <OpenLinkActionSections url={tab.url} />
                    <CopyLinkActionSection url={tab.url} title={tab.title} />
                    <EditTabActionSection tab={tab} mutate={mutate} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
