import { ActionPanel, List, Toast, getFrontmostApplication, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ListItemPassword } from "./components/ListItemPassword";
import { SyncAction } from "./components/actions/SyncActions";
import { getVaultCredentials, sync } from "./lib/dcli";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(getVaultCredentials);
  const { data: currentApplication } = usePromise(getFrontmostApplication);

  const isEmpty = !isLoading && data && data.length === 0;

  async function handleSync() {
    try {
      const toast = await showToast({
        title: "Syncing with Dashlane...",
        style: Toast.Style.Animated,
      });

      await sync();

      toast.style = Toast.Style.Success;
      toast.title = "Sync with Dashlane succeeded";

      await revalidate();

      toast.hide();
    } catch (error) {
      showToast({
        title: "Dashlane sync failed",
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Search Passwords" searchBarPlaceholder="Search your passwords">
      {data &&
        data.map((item) => (
          <ListItemPassword key={item.id} item={item} currentApplication={currentApplication} onSync={handleSync} />
        ))}
      {isLoading ? (
        <List.EmptyView title="Loading..." description="Please wait." />
      ) : (
        <List.EmptyView
          icon={{ source: "dashlane-64.png" }}
          title={isEmpty ? "Vault empty." : "No matching items found."}
          description={
            isEmpty
              ? "Hit the sync button to sync your vault or try logging in again."
              : "Hit the sync button to sync your vault."
          }
          actions={
            !isLoading && (
              <ActionPanel>
                <SyncAction onSync={handleSync} />
              </ActionPanel>
            )
          }
        />
      )}
    </List>
  );
}
