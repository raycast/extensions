import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { KVStore } from "../types";
import { getKVStores, deleteKVStore } from "../api";
import { KVStoreKeys } from "./kv-store-keys";

export function KVStoreList() {
  const [stores, setStores] = useState<KVStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      setIsLoading(true);
      const allStores: KVStore[] = [];
      let cursor: string | undefined;

      do {
        const response = await getKVStores(cursor);
        allStores.push(...response.data);
        cursor = response.meta.cursor;
      } while (cursor);

      setStores(allStores);
    } catch (error) {
      console.error("Error loading KV stores:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load KV stores",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteStore(store: KVStore) {
    if (
      await confirmAlert({
        title: "Delete KV Store",
        message: `Are you sure you want to delete "${store.name}"? This will permanently remove the store and all its keys.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteKVStore(store.id);
        await showToast({ style: Toast.Style.Success, title: "KV store deleted", message: store.name });
        await loadStores();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete KV store",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search KV stores by name...">
      {stores.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No KV Stores Found"
          description="Your account doesn't have any KV stores yet."
          icon={Icon.Tray}
        />
      ) : (
        stores.map((store) => (
          <List.Item
            key={store.id}
            title={store.name}
            subtitle={store.id}
            accessories={[{ text: new Date(store.created_at).toLocaleDateString(), tooltip: "Created" }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="Browse Keys" target={<KVStoreKeys store={store} />} icon={Icon.List} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Actions">
                  <Action.CopyToClipboard
                    title="Copy Store ID"
                    content={store.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
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
