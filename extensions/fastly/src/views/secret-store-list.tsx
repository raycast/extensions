import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { SecretStore } from "../types";
import { getSecretStores, deleteSecretStore } from "../api";
import { SecretStoreSecrets } from "./secret-store-secrets";

export function SecretStoreList() {
  const [stores, setStores] = useState<SecretStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      setIsLoading(true);
      const allStores: SecretStore[] = [];
      let cursor: string | undefined;

      do {
        const response = await getSecretStores(cursor);
        allStores.push(...response.data);
        cursor = response.meta.cursor;
      } while (cursor);

      setStores(allStores);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load secret stores",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteStore(store: SecretStore) {
    if (
      await confirmAlert({
        title: "Delete Secret Store",
        message: `Are you sure you want to delete "${store.name}"? This will permanently remove the store and all its secrets.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteSecretStore(store.id);
        await showToast({ style: Toast.Style.Success, title: "Secret store deleted", message: store.name });
        await loadStores();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete secret store",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search secret stores by name...">
      {stores.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Secret Stores Found"
          description="Your account doesn't have any secret stores yet."
          icon={Icon.Lock}
        />
      ) : (
        stores.map((store) => (
          <List.Item
            key={store.id}
            title={store.name}
            subtitle={store.id}
            icon={Icon.Lock}
            accessories={[{ text: new Date(store.created_at).toLocaleDateString(), tooltip: "Created" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="View Secrets" target={<SecretStoreSecrets store={store} />} icon={Icon.List} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Store ID"
                    content={store.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Store Name" content={store.name} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Store"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteStore(store)}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Quick Access">
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadStores}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
