import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConfigStore } from "../types";
import { getConfigStores, deleteConfigStore } from "../api";
import { ConfigStoreItems } from "./config-store-items";

export function ConfigStoreList() {
  const [stores, setStores] = useState<ConfigStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      setIsLoading(true);
      const stores = await getConfigStores();
      setStores(stores);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load config stores",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteStore(store: ConfigStore) {
    if (
      await confirmAlert({
        title: "Delete Config Store",
        message: `Are you sure you want to delete "${store.name}"? This will permanently remove the store and all its items.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteConfigStore(store.id);
        await showToast({ style: Toast.Style.Success, title: "Config store deleted", message: store.name });
        await loadStores();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete config store",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search config stores by name...">
      {stores.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Config Stores Found"
          description="Your account doesn't have any config stores yet."
          icon={Icon.Gear}
        />
      ) : (
        stores.map((store) => (
          <List.Item
            key={store.id}
            title={store.name}
            subtitle={store.id}
            icon={Icon.Gear}
            accessories={[{ text: new Date(store.updated_at).toLocaleDateString(), tooltip: "Last updated" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="View Items" target={<ConfigStoreItems store={store} />} icon={Icon.List} />
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
