import { List, Image, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useMemo } from "react";

import { Workspace } from "@/api";
import { ExtensionContextProvider } from "@/context/ExtensionContext";
import { useOrganizations, useWorkspaces } from "@/hooks";

function ManageWorkspaces() {
  const { organizations, isLoadingOrganizations } = useOrganizations();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();

  const [isShoingDetails, setIsShoingDetails] = useState(false);
  const [filterId, setFilterId] = useState(-1);

  const filteredWorkspaces = useMemo(() => {
    if (filterId == -1) return workspaces;
    return workspaces.filter((ws) => ws.organization_id === filterId);
  }, [workspaces, filterId]);

  return (
    <List
      isLoading={isLoadingOrganizations || isLoadingWorkspaces}
      searchBarAccessory={
        organizations.length < 2 ? undefined : (
          <List.Dropdown
            tooltip="Select Organization"
            onChange={(idStr) => setFilterId(parseInt(idStr))}
            storeValue={true}
          >
            <List.Dropdown.Item title="All" value="-1" />
            {organizations.map((organization) => (
              <List.Dropdown.Item title={organization.name} value={organization.id.toString()} key={organization.id} />
            ))}
          </List.Dropdown>
        )
      }
      isShowingDetail={isShoingDetails}
    >
      {filteredWorkspaces.length == 0 && <List.EmptyView title="No Workspaces Found" />}
      {filteredWorkspaces.map((workspace) => {
        const organization = organizations.find((org) => org.id === workspace.organization_id);
        const subscription = workspace.business_ws ? "Premium" : workspace.premium ? "Starter" : "Free";
        const role = formatRoleText(workspace.role);
        const logoUrl = workspace.logo_url == defaultWorkspaceLogoUrl ? undefined : workspace.logo_url;

        const accessories: List.Item.Accessory[] = [];
        if (!isShoingDetails) {
          if (workspace.business_ws) accessories.push({ tag: "Premium" });
          else if (workspace.premium) accessories.push({ tag: "Starter" });
          if (workspace.role != "user") accessories.push({ tag: formatRoleText(workspace.role) });
        }
        return (
          <List.Item
            title={workspace.name}
            subtitle={isShoingDetails ? undefined : organization?.name}
            key={workspace.id}
            icon={
              workspace.logo_url == "https://assets.track.toggl.com/images/workspace.jpg"
                ? undefined
                : { source: workspace.logo_url, mask: Image.Mask.RoundedRectangle }
            }
            accessories={isShoingDetails ? undefined : accessories}
            detail={
              <List.Item.Detail
                markdown={logoUrl ? `![${workspace.name} Logo](${logoUrl})` : undefined}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={workspace.id.toString()} />
                    {organization && <List.Item.Detail.Metadata.Label title="Organization" text={organization.name} />}
                    <List.Item.Detail.Metadata.Label title="Subscription" text={subscription} />
                    <List.Item.Detail.Metadata.Label title="Role" text={role} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={`${isShoingDetails ? "Hide" : "Show"} Details`}
                  icon={Icon.Info}
                  onAction={() => setIsShoingDetails((value) => !value)}
                />
                {organization && (
                  <Action.OpenInBrowser
                    url={`https://track.toggl.com/organizations/${organization.id}/workspaces/${workspace.id}`}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const defaultWorkspaceLogoUrl = "https://assets.track.toggl.com/images/workspace.jpg";

const formatRoleText = (role: Workspace["role"]) =>
  role == "projectlead"
    ? "Project Lead"
    : role == "teamlead"
      ? "Team Leader"
      : ((role[0].toUpperCase() + role.slice(1)) as Capitalize<typeof role>);

export default function Command() {
  return (
    <ExtensionContextProvider>
      <ManageWorkspaces />
    </ExtensionContextProvider>
  );
}
