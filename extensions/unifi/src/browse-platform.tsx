import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { RESOURCE_DEFINITIONS, type ResourceContext, type ResourceKey } from "./api/resources";
import type { JsonObject } from "./api/types";
import { ResourceItem, resourceTitle } from "./components/resource-item";
import { ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";

const ROOT_PLATFORM_RESOURCES = RESOURCE_DEFINITIONS.filter(
  (resource) =>
    !["network", "protect"].includes(resource.service) &&
    !["mobility-admins", "mobility-devices", "mobility-device-clients"].includes(resource.key),
);

function ContextResourceList({ resourceKey, context }: { resourceKey: ResourceKey; context: ResourceContext }) {
  const client = useUniFiClient();
  const definition = RESOURCE_DEFINITIONS.find((candidate) => candidate.key === resourceKey);
  const load = useCallback(
    (signal: AbortSignal) => client.listResource(resourceKey, context, signal),
    [client, context, resourceKey],
  );
  const { data: items = [], error, isLoading, revalidate } = useAsyncResource(load);

  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List filtering isLoading={isLoading} isShowingDetail navigationTitle={definition?.label}>
      {items.map((item, index) => (
        <ResourceItem
          key={String(item.id ?? `${resourceKey}-${index}`)}
          item={item}
          fallbackTitle={`${definition?.label ?? "Resource"} ${index + 1}`}
        />
      ))}
      {!isLoading && items.length === 0 ? (
        <List.EmptyView title={`No ${definition?.label ?? "resources"} found`} />
      ) : null}
    </List>
  );
}

function PlatformActions({
  item,
  resourceKey,
  onRefresh,
}: {
  item: JsonObject;
  resourceKey: ResourceKey;
  onRefresh: () => void;
}) {
  const workspaceId = String(item.workspace_id ?? item.id ?? "");

  return (
    <ActionPanel>
      {resourceKey === "mobility-workspaces" && workspaceId ? (
        <ActionPanel.Section title="Mobility Workspace">
          <Action.Push
            title="Browse Devices"
            icon={Icon.Network}
            target={<ContextResourceList resourceKey="mobility-devices" context={{ workspaceId }} />}
          />
          <Action.Push
            title="Browse Admins"
            icon={Icon.Person}
            target={<ContextResourceList resourceKey="mobility-admins" context={{ workspaceId }} />}
          />
        </ActionPanel.Section>
      ) : null}
      <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(item, null, 2)} />
      {workspaceId ? <Action.CopyToClipboard title="Copy ID" content={workspaceId} /> : null}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}

export default function BrowsePlatform() {
  const client = useUniFiClient();
  const [resourceKey, setResourceKey] = useState<ResourceKey>("site-manager-hosts");
  const load = useCallback(
    (signal: AbortSignal) => client.listResource(resourceKey, {}, signal),
    [client, resourceKey],
  );
  const { data: items = [], error, isLoading, revalidate } = useAsyncResource(load);
  const definition = ROOT_PLATFORM_RESOURCES.find((candidate) => candidate.key === resourceKey);

  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List
      filtering
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={`Search ${definition?.label ?? "UniFi resources"}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Platform Resource"
          value={resourceKey}
          onChange={(value) => setResourceKey(value as ResourceKey)}
        >
          {["site-manager", "mobility", "innerspace", "carrier-fabric"].map((service) => (
            <List.Dropdown.Section key={service} title={service.replace("-", " ")}>
              {ROOT_PLATFORM_RESOURCES.filter((resource) => resource.service === service).map((resource) => (
                <List.Dropdown.Item key={resource.key} title={resource.label} value={resource.key} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {items.map((item, index) => (
        <ResourceItem
          key={String(item.id ?? item.workspace_id ?? `${resourceKey}-${index}`)}
          item={item}
          fallbackTitle={resourceTitle(item, `${definition?.label ?? "Resource"} ${index + 1}`)}
          actions={<PlatformActions item={item} resourceKey={resourceKey} onRefresh={revalidate} />}
        />
      ))}
      {!isLoading && items.length === 0 ? (
        <List.EmptyView title={`No ${definition?.label ?? "resources"} found`} />
      ) : null}
    </List>
  );
}
