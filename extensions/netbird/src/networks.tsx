import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getNetbirdNetworks, getNetbirdStatus, netbirdNetworksDeselect, netbirdNetworksSelect } from "./utils";
import type { NetbirdNetworkRoute } from "./utils";

type NetworksViewModel = {
  isConnected: boolean;
  routes: NetbirdNetworkRoute[];
};

export default function Command() {
  // promise wrapper in order to preserve one hook only for the command and manage race conditions properly
  const { data, error, isLoading, revalidate } = usePromise(async (): Promise<NetworksViewModel> => {
    // Parallel fetches - networks and status are fetched at the same time.
    // If status resolves to "Not Connected", we show the dedicated disconnected view.
    // If status fails, we ignore the status error and rely on `netbird networks list`.
    //
    // This optimisation is probably not really needed, but author is a little optimization-freak.
    const statusPromise = getNetbirdStatus().catch(() => null);

    let networksError: unknown;
    const networksPromise = getNetbirdNetworks().catch((e) => {
      networksError = e;
      return [] as NetbirdNetworkRoute[];
    });

    const status = await statusPromise;
    if (status && !status.management.connected) {
      return { isConnected: false, routes: [] };
    }

    const routes = await networksPromise;
    if (networksError) {
      throw networksError;
    }

    return { isConnected: true, routes };
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to fetch networks"
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

  if (data && data.routes.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="No Networks Found"
          description="It looks like there are no network routes configured for your NetBird peer."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search networks...">
      {data?.routes.map((route) => {
        const isSelected = route.selected;
        const subtitle = route.route ?? undefined;

        return (
          <List.Item
            key={route.id}
            icon={{
              source: Icon.CircleFilled,
              tintColor: isSelected ? Color.Green : Color.SecondaryText,
            }}
            title={route.id}
            subtitle={subtitle}
            accessories={[{ text: isSelected ? "Selected" : "Not Selected" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Route">
                  <Action
                    icon={isSelected ? Icon.MinusCircle : Icon.PlusCircle}
                    title={isSelected ? "Deselect" : "Select"}
                    onAction={async () => {
                      const actionTitle = isSelected ? "Deselecting network" : "Selecting network";
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: actionTitle,
                        message: route.id,
                      });

                      try {
                        if (isSelected) {
                          await netbirdNetworksDeselect(route.id);
                        } else {
                          await netbirdNetworksSelect(route.id);
                        }
                        await toast.hide();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Done",
                          message: route.id,
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
