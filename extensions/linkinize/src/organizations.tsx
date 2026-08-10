import { Action, ActionPanel, LaunchType, List, launchCommand, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Organization, Workspace } from "./interfaces";
import {
  authenticationCheck,
  getActiveOrganizationId,
  getActiveWorkspaceId,
  getCachedOrganizations,
  getCachedWorkspaces,
  performSync,
} from "./support";

export default function Command() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const authenticated = await authenticationCheck();
      if (!authenticated) {
        if (!canceled) {
          setIsLoading(false);
        }
        return;
      }
      let cachedOrganizations = getCachedOrganizations();
      let cachedWorkspaces = getCachedWorkspaces();
      if (cachedOrganizations.length === 0 || cachedWorkspaces.length === 0) {
        await performSync();
        cachedOrganizations = getCachedOrganizations();
        cachedWorkspaces = getCachedWorkspaces();
      }
      if (!canceled) {
        setOrganizations(cachedOrganizations);
        setWorkspaces(cachedWorkspaces);
        setActiveOrganizationId(getActiveOrganizationId());
        setActiveWorkspaceId(getActiveWorkspaceId());
        setIsLoading(false);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Linkinize" searchBarPlaceholder="Switch organization or workspace">
      <List.EmptyView
        title="No organizations or workspaces yet"
        description="Sync to load your Linkinize account data."
        actions={
          <ActionPanel>
            <Action
              title="Synchronize"
              onAction={() => launchCommand({ name: "synchronize", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Organizations">
        {organizations.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            accessories={activeOrganizationId === item.id ? [{ text: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action title="Switch Organization" onAction={() => switchOrganization(item)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Workspaces">
        {workspaces.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            accessories={activeWorkspaceId === item.id ? [{ text: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action title="Switch Workspace" onAction={() => switchWorkspace(item)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function switchOrganization(organization: Organization) {
  const synced = await performSync({ organizationId: organization.id });
  if (synced) {
    await showToast({ title: "Organization updated", message: `Active organization: ${organization.name}` });
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  }
}

async function switchWorkspace(workspace: Workspace) {
  const synced = await performSync({ workspaceId: workspace.id });
  if (synced) {
    await showToast({ title: "Workspace updated", message: `Active workspace: ${workspace.name}` });
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  }
}
