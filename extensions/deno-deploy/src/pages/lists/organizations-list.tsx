import { useCallback } from "react";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import type { Organization } from "@/api/types";
import { useDashApi } from "@/hooks/useDashApi";
import useDenoState from "@/hooks/useDenoState";

const ProjectListSection = () => {
  const { useOrganizations } = useDashApi();
  const { user, selectedOrganization, updateSelectedOrganization } = useDenoState();
  const { isLoading, data, error, revalidate } = useOrganizations();

  const getOrgTitle = useCallback(
    (org: Organization) => {
      return org.name ?? (user ? (user.id === org.id ? `${user.name} (Personal)` : "<unnamed>") : "<unnamed>");
    },
    [user],
  );

  const getOrgFeatures = useCallback(
    (org: Organization) => {
      const keys = Object.keys(org.features).filter((key) => org.features[key as keyof typeof org.features]);
      return keys.length > 0 ? keys.join(", ") : "<empty>";
    },
    [user],
  );

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  return (
    <List
      searchBarPlaceholder="Search Organizations..."
      navigationTitle="Results"
      isLoading={isLoading || !user}
      selectedItemId={selectedOrganization}
      isShowingDetail
    >
      {error && (
        <List.Item
          title="Error"
          subtitle={error.message}
          icon={{ source: Icon.XMarkCircle, tintColor: "red" }}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && data && data.length > 0 ? (
        data
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map((org) => (
            <List.Item
              key={org.id}
              id={org.id}
              subtitle={org.id === selectedOrganization ? `Active` : ``}
              title={getOrgTitle(org)}
              icon={{ source: Icon.TwoPeople }}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={getOrgTitle(org)} />
                      <List.Item.Detail.Metadata.Label title="ID" text={org.id} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Plan" text={org.subscription.plan} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Created" text={org.createdAt} />
                      <List.Item.Detail.Metadata.Label title="Updated" text={org.updatedAt} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Features" text={getOrgFeatures(org)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {org.id !== selectedOrganization ? (
                    <Action
                      title="Make Active"
                      icon={Icon.Checkmark}
                      shortcut={{ modifiers: [], key: "return" }}
                      onAction={async () => {
                        await updateSelectedOrganization(org.id);
                        refresh();
                      }}
                    />
                  ) : null}
                  <Action.OpenInBrowser
                    title="Open Projects Page"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    url={
                      org.id === user?.id ? "https://dash.deno.com/projects" : `https://dash.deno.com/orgs/${org.id}`
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                </ActionPanel>
              }
            />
          ))
      ) : (
        <List.Item
          title="Something might be wrong"
          subtitle={"No data, please refresh the list"}
          icon={{ source: Icon.XMarkCircle, tintColor: "red" }}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default ProjectListSection;
