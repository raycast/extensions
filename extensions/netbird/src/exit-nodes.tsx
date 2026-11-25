import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  getNetbirdNetworks,
  getNetbirdStatus,
  isExitNodeRoute,
  netbirdDeselectExitNode,
  netbirdSelectExitNode,
} from "./utils";
import type { NetbirdNetworkRoute } from "./utils";

type ExitNodesViewModel = {
  isConnected: boolean;
  exitNodes: NetbirdNetworkRoute[];
};

export default function Command() {
  // promise wrapper in order to preserve one hook only for the command and manage race conditions properly
  const { data, error, isLoading, revalidate } = usePromise(async (): Promise<ExitNodesViewModel> => {
    // Parallel fetches - networks and status are fetched at the same time.
    // If status resolves to "Not Connected", we show the dedicated disconnected view.
    // If status fails, we ignore the status error and rely on `netbird networks list`.
    const statusPromise = getNetbirdStatus().catch(() => null);

    let networksError: unknown;
    const networksPromise = getNetbirdNetworks().catch((e) => {
      networksError = e;
      return [] as NetbirdNetworkRoute[];
    });

    const status = await statusPromise;
    if (status && !status.management.connected) {
      return { isConnected: false, exitNodes: [] };
    }

    const routes = await networksPromise;
    if (networksError) {
      throw networksError;
    }

    return { isConnected: true, exitNodes: routes.filter(isExitNodeRoute) };
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to fetch exit nodes"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Help" url="https://netbird.io/docs" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (data && !data.isConnected) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="NetBird is not connected"
          description="Your NetBird client is not connected to the management server. Please check your connection and try again."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Help" url="https://netbird.io/docs" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (data && data.exitNodes.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Network}
          title="No Exit Nodes Found"
          description="It looks like there are no exit nodes configured for your NetBird peer."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search exit nodes...">
      {data?.exitNodes.map((node) => {
        const isActive = node.selected;

        return (
          <List.Item
            key={node.id}
            icon={{
              source: Icon.CircleFilled,
              tintColor: isActive ? Color.Green : Color.SecondaryText,
            }}
            title={node.id}
            accessories={[{ text: isActive ? "Active" : "Not Active" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Exit Node">
                  <Action
                    icon={isActive ? Icon.MinusCircle : Icon.PlusCircle}
                    title={isActive ? "Deselect Exit Node" : "Select as Exit Node"}
                    onAction={async () => {
                      const actionTitle = isActive ? "Deselecting exit node" : "Selecting exit node";
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: actionTitle,
                        message: node.id,
                      });

                      try {
                        if (isActive) {
                          await netbirdDeselectExitNode(node.id);
                        } else {
                          await netbirdSelectExitNode(node.id, data?.exitNodes ?? []);
                        }
                        await toast.hide();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Done",
                          message: node.id,
                        });
                        await revalidate();
                      } catch (e) {
                        await toast.hide();
                        await showFailureToast(e, { title: "Failed" });
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
