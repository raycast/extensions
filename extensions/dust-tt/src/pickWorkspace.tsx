import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { getDustClient, withDustClient } from "./dust_api/oauth";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getRandomGreetingForName, getWorkspaceId } from "./utils";
import { useCallback } from "react";

export default withDustClient(function PickWorkspaceCommand() {
  const navigation = useNavigation();
  const dustAPI = getDustClient();
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const isUsingOauth = preferences.connexionFlow === "oauth";

  const { data: user, isLoading: isLoadingUser } = usePromise(
    async (isUsingOauth) => {
      if (isUsingOauth) {
        const r = await dustAPI.me();
        if (r.isErr()) {
          showFailureToast(`Could not get user information: ${r.error.message}`);
          return undefined;
        } else {
          // Keep the user updated in the local storage as much as possible
          await LocalStorage.setItem("user", JSON.stringify(r.value));
          return r.value;
        }
      } else {
        return undefined;
      }
    },
    [isUsingOauth],
  );

  const { data: workspaceId, isLoading: isLoadingWorkspace } = usePromise(
    async (isUsingOauth, isLoadingUser) => {
      if (isUsingOauth && !isLoadingUser) {
        return getWorkspaceId();
      }
      return undefined;
    },
    [isUsingOauth, isLoadingUser],
  );

  const setWorkspaceId = useCallback(
    async (workspace: { sId: string; name: string }) => {
      updateCommandMetadata({ subtitle: `Currently using: "${workspace.name}"` });
      await LocalStorage.setItem("workspaceId", workspace.sId);
      navigation.pop();
    },
    [navigation],
  );

  if (isUsingOauth) {
    return (
      <List isLoading={isLoadingUser || isLoadingWorkspace} selectedItemId={workspaceId}>
        {user && (
          <List.Section title={`${getRandomGreetingForName(user.firstName)}, please pick a workspace below:`}>
            {user.workspaces.map((workspace) => (
              <List.Item
                key={workspace.sId}
                id={workspace.sId}
                title={workspace.name}
                subtitle={workspace.sId}
                accessories={[
                  {
                    tag: { value: workspace.role, color: workspace.role === "admin" ? Color.Blue : Color.Green },
                    icon: workspaceId === workspace.sId ? { source: Icon.Check } : null,
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
      </List>
    );
  } else {
    return (
      <Detail
        navigationTitle="Not using OAuth"
        markdown="Workspace selection is **only available when connecting with your own Dust account** and not **workspace API Key**. _You can change the connexion method in the extension preferences._"
      />
    );
  }
});
