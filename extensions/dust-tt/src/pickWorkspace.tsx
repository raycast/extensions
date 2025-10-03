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
import { getRandomGreetingForName, getWorkspaceId, setUser } from "./utils";
import { useCallback } from "react";
import { MeResponseType } from "@dust-tt/client";
import { withDustClient, getDustClient } from "./dust_api/oauth";

type WorkspaceWithRegion = {
  sId: string;
  name: string;
  region: string;
};

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
        workspaces.push({ sId: org.externalId!, name: org.name, region: org.metadata.region });
      });

      if (user.selectedWorkspace) {
        const selectedOrg = workspaces.find((org) => org.sId === user?.selectedWorkspace);
        await setWorkspaceId(selectedOrg || workspaces[0]);
      }
    }

    return { user, workspaces };
  }, []);

  const { data: currentWorkspaceId, isLoading: isLoadingWorkspace } = usePromise(async () => getWorkspaceId(), []);

  const setWorkspaceId = useCallback(async (workspace: WorkspaceWithRegion) => {
    updateCommandMetadata({ subtitle: `Currently using: "${workspace.name}" (${workspace.region})` });
    await LocalStorage.setItem("workspaceId", workspace.sId);
    await LocalStorage.setItem("selectedRegion", workspace.region);
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
                      setWorkspaceId(workspace);
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
