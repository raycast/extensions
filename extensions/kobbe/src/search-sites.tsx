import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { listSites, useKobbeQuery } from "./api";
import { getKobbePreferences } from "./preferences";
import { SiteListItem } from "./views";

export default function SearchSites() {
  const range = getKobbePreferences().defaultRange;
  const sites = useKobbeQuery(listSites);

  return (
    <List
      isLoading={sites.isLoading}
      navigationTitle="Search Kobbe Sites"
      searchBarPlaceholder="Search by site or domain..."
    >
      {sites.error ? (
        <List.EmptyView
          title="Could not load Kobbe sites"
          description={sites.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={sites.revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {sites.data?.length === 0 ? (
        <List.EmptyView title="No sites found" description="Create a site in Kobbe first, then come back to Raycast." />
      ) : null}
      {sites.data?.map((site) => (
        <SiteListItem key={site.id} site={site} range={range} onRefresh={sites.revalidate} />
      ))}
    </List>
  );
}
