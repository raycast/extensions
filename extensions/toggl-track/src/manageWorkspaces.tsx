import { useState, useMemo } from "react";
import { List, Image } from "@raycast/api";
import { ExtensionContextProvider } from "./context/ExtensionContext";
import { useOrganizations, useWorkspaces } from "./hooks";

function ManageWorkspaces() {
  const { organizations, isLoadingOrganizations } = useOrganizations();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();

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
    >
      {filteredWorkspaces.length == 0 && <List.EmptyView title="No Workspaces Found" />}
      {filteredWorkspaces.map((workspace) => (
        <List.Item
          title={workspace.name}
          key={workspace.id}
          icon={{ source: workspace.logo_url, mask: Image.Mask.RoundedRectangle }}
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <ExtensionContextProvider>
      <ManageWorkspaces />
    </ExtensionContextProvider>
  );
}
