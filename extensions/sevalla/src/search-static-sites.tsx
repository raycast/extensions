import { ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { makeRequest } from "./sevalla";
import { StaticSite } from "./types";
import OpenInSevalla from "./open-in-sevalla";

export default function Command() {
  const {isLoading,data:sites}= useCachedPromise(async() => {
    const result = await makeRequest<{company: {static_sites: {items: StaticSite[]}}}>("static-sites");
    return result.company.static_sites.items;
  },[], {
    initialData: []
  })
  return <List isLoading={isLoading}>
    {!isLoading && !sites.length ? <List.EmptyView title="Create your first static site" actions={<ActionPanel>
      <OpenInSevalla route="staticSites/new" />
    </ActionPanel>} /> : sites.map(site => <List.Item key={site.id} title={site.display_name} />)}
  </List>
}
