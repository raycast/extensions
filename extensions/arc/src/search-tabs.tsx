import { ActionPanel, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { CopyLinkActionSection, EditTabActionSection, OpenLinkActionSections } from "./actions";
import { getTabs } from "./arc";
import { useBookmarks } from "./hooks/useBookmarks";
import { getDomain, getKey, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";
import { VersionCheck } from "./version";

function SearchTabs() {
  const { data, isLoading, mutate } = useCachedPromise(getTabs);
  const { isBookmarksLoading, savedBookmarks, updateBookmarks } = useBookmarks();

  const orderedLocations = getOrderedLocations();
  const groupedTabs = groupBy(data, (tab) => tab.location);

  return (
    <List isLoading={isLoading || isBookmarksLoading} filtering={{ keepSectionOrder: true }}>
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
                    <EditTabActionSection
                      tab={tab}
                      mutate={mutate}
                      savedBookmarks={savedBookmarks}
                      updateBookmarks={updateBookmarks}
                    />
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

export default function Command() {
  return (
    <VersionCheck>
      <SearchTabs />
    </VersionCheck>
  );
}
