import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { fetchOAuthWorkspaceId, getOAuthLinearClient, linear } from "./api/linearClient";
import { getActiveWorkspaceId, getStoredWorkspaces, removeWorkspace, setActiveWorkspaceId } from "./api/workspaces";

interface WorkspaceListItem {
  id: string;
  name: string;
  urlKey: string;
  logoUrl?: string;
  type: "oauth" | "pat";
}

function SwitchWorkspace() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const storedWorkspaces = await getStoredWorkspaces();
    const activeWorkspaceId = await getActiveWorkspaceId();
    const oauthWorkspaceId = await fetchOAuthWorkspaceId();

    let oauthWorkspace: WorkspaceListItem | null = null;
    const oauthClient = getOAuthLinearClient();
    if (oauthClient) {
      try {
        const org = await oauthClient.organization;
        oauthWorkspace = {
          id: org.id,
          name: org.name,
          urlKey: org.urlKey,
          logoUrl: org.logoUrl ?? undefined,
          type: "oauth",
        };
      } catch {
        // OAuth client may not be fully initialized yet
      }
    }

    const allWorkspaces: WorkspaceListItem[] = [
      ...(oauthWorkspace ? [oauthWorkspace] : []),
      ...storedWorkspaces
        .filter((w) => w.type === "pat")
        .map((w) => ({
          id: w.id,
          name: w.name,
          urlKey: w.urlKey,
          logoUrl: w.logoUrl,
          type: w.type,
        })),
    ];

    const effectiveActiveId = activeWorkspaceId ?? oauthWorkspaceId;

    return { allWorkspaces, effectiveActiveId };
  });

  const allWorkspaces = data?.allWorkspaces ?? [];
  const effectiveActiveId = data?.effectiveActiveId;

  return (
    <List isLoading={isLoading}>
      {allWorkspaces.map((workspace) => {
        const isActive = workspace.id === effectiveActiveId;
        return (
          <List.Item
            key={workspace.id}
            icon={workspace.logoUrl ? { source: workspace.logoUrl, mask: Image.Mask.RoundedRectangle } : Icon.Building}
            title={workspace.name}
            subtitle={workspace.urlKey}
            accessories={[
              ...(workspace.type === "pat" ? [{ tag: "PAT" }] : [{ tag: "OAuth" }]),
              ...(isActive ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Active" }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {!isActive && (
                    <Action
                      title="Switch to This Workspace"
                      icon={Icon.Switch}
                      onAction={async () => {
                        await setActiveWorkspaceId(workspace.id);
                        await showToast({ style: Toast.Style.Success, title: `Switched to ${workspace.name}` });
                        await popToRoot();
                      }}
                    />
                  )}
                </ActionPanel.Section>
                {workspace.type === "pat" && (
                  <ActionPanel.Section>
                    <Action
                      title="Remove Workspace"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await removeWorkspace(workspace.id);
                        await showToast({ style: Toast.Style.Success, title: `Removed ${workspace.name}` });
                        revalidate();
                      }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        key="add-workspace"
        icon={Icon.Plus}
        title="Add Workspace"
        subtitle="Connect another workspace via Personal Access Token"
        actions={
          <ActionPanel>
            <Action
              title="Add Workspace"
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "add-workspace", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default withAccessToken(linear)(SwitchWorkspace);
