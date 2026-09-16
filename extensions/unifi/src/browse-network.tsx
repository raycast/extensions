import { Action, ActionPanel, Icon, List, type LaunchProps } from "@raycast/api";
import { useCallback, useState } from "react";
import { getSelectedSite } from "./api/preferences";
import { RESOURCE_DEFINITIONS, type ResourceKey } from "./api/resources";
import { ResourceItem } from "./components/resource-item";
import { MissingSite, ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import type { ResourceLaunchContext } from "./lib/resource-navigation";

const NETWORK_RESOURCES = RESOURCE_DEFINITIONS.filter(
  (resource) =>
    resource.service === "network" && !["network-sites", "network-devices", "network-clients"].includes(resource.key),
);

type BrowseNetworkProps = LaunchProps<{ launchContext?: ResourceLaunchContext }>;

export default function BrowseNetwork(props: BrowseNetworkProps) {
  const client = useUniFiClient();
  const [resourceKey, setResourceKey] = useState<ResourceKey>(props.launchContext?.resourceKey ?? "network-networks");
  const siteLoad = useCallback(() => getSelectedSite(), []);
  const { data: site, isLoading: siteIsLoading } = useAsyncResource(siteLoad);
  const load = useCallback(
    (signal: AbortSignal) =>
      site ? client.listResource(resourceKey, { siteId: site.id }, signal) : Promise.resolve([]),
    [client, resourceKey, site],
  );
  const { data: items = [], error, isLoading, revalidate } = useAsyncResource(load);
  const definition = NETWORK_RESOURCES.find((candidate) => candidate.key === resourceKey);

  if (!site && !siteIsLoading) return <MissingSite />;
  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List
      filtering
      isLoading={isLoading || siteIsLoading}
      isShowingDetail
      searchBarPlaceholder={`Search ${definition?.label ?? "Network resources"}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Resource"
          value={resourceKey}
          onChange={(value) => setResourceKey(value as ResourceKey)}
        >
          {NETWORK_RESOURCES.map((resource) => (
            <List.Dropdown.Item key={resource.key} title={resource.label} value={resource.key} />
          ))}
        </List.Dropdown>
      }
    >
      {items.map((item, index) => (
        <ResourceItem
          key={String(item.id ?? `${resourceKey}-${index}`)}
          item={item}
          fallbackTitle={`${definition?.label ?? "Resource"} ${index + 1}`}
        />
      ))}
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          title={`No ${definition?.label ?? "resources"} found`}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
