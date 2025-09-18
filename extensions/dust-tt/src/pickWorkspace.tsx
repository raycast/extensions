import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getRandomGreetingForName, getWorkspaceId } from "./utils";
import { useCallback } from "react";
import { DustAPI } from "@dust-tt/client";
import { withDustClient, getCurrentToken } from "./dust_api/oauth";

const DUST_US_URL = "https://dust.tt";
const DUST_EU_URL = "https://eu.dust.tt";

type WorkspaceWithRegion = {
  sId: string;
  name: string;
  role: string;
  region: string;
};

export default withDustClient(function PickWorkspaceCommand() {
  const navigation = useNavigation();

  const { data: workspacesData, isLoading: isLoadingWorkspaces } = usePromise(async () => {
    const usWorkspaces: WorkspaceWithRegion[] = [];
    const euWorkspaces: WorkspaceWithRegion[] = [];
    let user = null;
    const token = getCurrentToken();

    // Fetch from US region
    try {
      const usAPI = new DustAPI({ url: DUST_US_URL }, { apiKey: token, workspaceId: "" }, console);
      const usResult = await usAPI.me();
      if (usResult.isOk()) {
        usWorkspaces.push(
          ...usResult.value.workspaces.map((ws) => ({
            ...ws,
            region: "us-central1",
          })),
        );
        user = usResult.value;
      }
    } catch (error) {
      // The user might not be exist in US region, so we can ignore errors here.
    }

    // Fetch from EU region
    try {
      const euAPI = new DustAPI({ url: DUST_EU_URL }, { apiKey: token, workspaceId: "" }, console);
      const euResult = await euAPI.me();
      if (euResult.isOk()) {
        euWorkspaces.push(
          ...euResult.value.workspaces.map((ws) => ({
            ...ws,
            region: "europe-west1",
          })),
        );
        // Use EU user info if we didn't get US info
        if (!user) {
          user = euResult.value;
        }
      }
    } catch (error) {
      // The user might not be exist in EU region, so we can ignore errors here.
    }

    // Store user info for greeting
    if (user) {
      await LocalStorage.setItem("user", JSON.stringify(user));
    }

    return { usWorkspaces, euWorkspaces, user };
  }, []);

  const { data: currentWorkspaceId, isLoading: isLoadingWorkspace } = usePromise(async () => getWorkspaceId(), []);

  const setWorkspaceId = useCallback(
    async (workspace: WorkspaceWithRegion) => {
      updateCommandMetadata({ subtitle: `Currently using: "${workspace.name}" (${workspace.region})` });
      await LocalStorage.setItem("workspaceId", workspace.sId);
      await LocalStorage.setItem("selectedRegion", workspace.region);
      navigation.pop();
    },
    [navigation],
  );

  const user = workspacesData?.user;
  const usWorkspaces = workspacesData?.usWorkspaces || [];
  const euWorkspaces = workspacesData?.euWorkspaces || [];

  return (
    <List isLoading={isLoadingWorkspaces || isLoadingWorkspace} selectedItemId={currentWorkspaceId}>
      {user && (usWorkspaces.length > 0 || euWorkspaces.length > 0) ? (
        <>
          <List.Section title={`${getRandomGreetingForName(user.firstName)}, please pick a workspace below:`} />

          {usWorkspaces.length > 0 && (
            <List.Section title="🇺🇸 US">
              {usWorkspaces.map((workspace) => (
                <List.Item
                  key={`${workspace.region}-${workspace.sId}`}
                  id={workspace.sId}
                  title={workspace.name}
                  subtitle={workspace.sId}
                  accessories={[
                    {
                      tag: { value: workspace.role, color: workspace.role === "admin" ? Color.Blue : Color.Green },
                      icon: currentWorkspaceId === workspace.sId ? { source: Icon.Check } : null,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Select"
                        icon={Icon.Check}
                        shortcut={{ key: "return", modifiers: [] }}
                        onAction={() => setWorkspaceId(workspace)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {euWorkspaces.length > 0 && (
            <List.Section title="🇪🇺 Europe">
              {euWorkspaces.map((workspace) => (
                <List.Item
                  key={`${workspace.region}-${workspace.sId}`}
                  id={workspace.sId}
                  title={workspace.name}
                  subtitle={workspace.sId}
                  accessories={[
                    {
                      tag: { value: workspace.role, color: workspace.role === "admin" ? Color.Blue : Color.Green },
                      icon: currentWorkspaceId === workspace.sId ? { source: Icon.Check } : null,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Select"
                        icon={Icon.Check}
                        shortcut={{ key: "return", modifiers: [] }}
                        onAction={() => setWorkspaceId(workspace)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        <List.EmptyView title="No workspaces found" description="No workspaces were found in either US or EU regions" />
      )}
    </List>
  );
});
