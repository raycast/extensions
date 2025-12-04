import { MeResponseType } from "@dust-tt/client";
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
import { useCallback } from "react";
import { getDustClient, recreateDustClientForRegion, withDustClient } from "./dust_api/oauth";
import { getRandomGreetingForName, getWorkspaceId, setUser } from "./utils";

type WorkspaceWithRegion = {
  sId: string;
  name: string;
  region: string;
};

// Helper function to save both workspace ID and region
async function saveWorkspaceWithRegion(workspace: WorkspaceWithRegion) {
  console.log(`Saving workspace: ${workspace.name} (${workspace.sId}) with region: ${workspace.region}`);
  await LocalStorage.setItem("workspaceId", workspace.sId);
  await LocalStorage.setItem("selectedRegion", workspace.region);

  // Recreate the API client for the new region
  await recreateDustClientForRegion(workspace.region);

  updateCommandMetadata({ subtitle: `Currently using: "${workspace.name}" (${workspace.region})` });
}

export default withDustClient(function PickWorkspaceCommand() {
  const navigation = useNavigation();

  const { data: workspacesData, isLoading: isLoadingWorkspaces } = usePromise(async () => {
    const workspaces: WorkspaceWithRegion[] = [];
    let user: MeResponseType["user"] | undefined = undefined;

    const dustAPI = getDustClient();

    const me = await dustAPI.me();
    if (me.isOk()) {
      user = me.value;
      await setUser(user);

      user.organizations?.forEach((org) => {
        const region = org.metadata?.region || "us-central1"; // Default to US if region is missing
        workspaces.push({ sId: org.externalId!, name: org.name, region: region });
      });

      if (user.selectedWorkspace) {
        const selectedOrg = workspaces.find((org) => org.sId === user?.selectedWorkspace);
        // Use the helper function to save both workspace ID and region
        if (selectedOrg) {
          await saveWorkspaceWithRegion(selectedOrg);
        } else if (workspaces.length > 0) {
          await saveWorkspaceWithRegion(workspaces[0]);
        }
      }
    } else {
      // Authentication failed - clear stale data
      await LocalStorage.removeItem("workspaceId");
      await LocalStorage.removeItem("selectedRegion");
      await LocalStorage.removeItem("user");
    }

    return { user, workspaces };
  }, []);

  const { data: currentWorkspaceId, isLoading: isLoadingWorkspace } = usePromise(async () => getWorkspaceId(), []);

  const setWorkspaceWithRegion = useCallback(async (workspace: WorkspaceWithRegion) => {
    await saveWorkspaceWithRegion(workspace);
  }, []);

  const user = workspacesData?.user;
  const workspaces = workspacesData?.workspaces || [];

  return (
    <List isLoading={isLoadingWorkspaces || isLoadingWorkspace} selectedItemId={currentWorkspaceId}>
      {user && workspaces.length > 0 ? (
        <>
          <List.Section title={`${getRandomGreetingForName(user.firstName)}, please pick a workspace below:`} />

          {workspaces.map((workspace) => (
            <List.Item
              key={`${workspace.region}-${workspace.sId}`}
              id={workspace.sId}
              title={workspace.name}
              subtitle={workspace.sId}
              accessories={[
                {
                  tag: {
                    value: workspace.region === "europe-west1" ? "🇪🇺 Europe" : "🇺🇸 US",
                    color: workspace.region === "europe-west1" ? Color.Blue : Color.Red,
                  },
                  icon: currentWorkspaceId === workspace.sId ? { source: Icon.Check } : null,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    icon={Icon.Check}
                    shortcut={{ key: "return", modifiers: [] }}
                    onAction={() => {
                      setWorkspaceWithRegion(workspace);
                      navigation.pop();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No workspaces found" description="No workspaces were found in either US or EU regions" />
      )}
    </List>
  );
});
