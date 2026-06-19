import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Keyboard,
  confirmAlert,
  Alert,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { KVStore } from "../types";
import { getKVStoreKeys, deleteKVStoreKey, getKVStoreKeyValue } from "../api";
import { KVKeyDetail } from "./kv-key-detail";
import { KVKeyForm } from "./kv-key-form";

interface KVStoreKeysProps {
  store: KVStore;
}

export function KVStoreKeys({ store }: KVStoreKeysProps) {
  const [keys, setKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const allKeys: string[] = [];
      let cursor: string | undefined;

      do {
        const response = await getKVStoreKeys(store.id, cursor);
        allKeys.push(...response.data);
        cursor = response.meta.cursor;
      } while (cursor);

      setKeys(allKeys);
    } catch (error) {
      console.error("Error loading keys:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load keys",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleDeleteKey(keyName: string) {
    if (
      await confirmAlert({
        title: "Delete Key",
        message: `Are you sure you want to delete "${keyName}" from "${store.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteKVStoreKey(store.id, keyName);
        await showToast({ style: Toast.Style.Success, title: "Key deleted", message: keyName });
        await loadKeys();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete key",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleExportStore() {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting store..." });
      const exported: Record<string, string> = {};

      const BATCH_SIZE = 20;
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((key) => getKVStoreKeyValue(store.id, key)));
        batch.forEach((key, idx) => (exported[key] = results[idx]));
      }

      const json = JSON.stringify(exported, null, 2);
      toast.hide();
      // We return the JSON via copy-to-clipboard since Raycast doesn't have file download
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "Store exported",
        message: `${keys.length} key-value pairs copied to clipboard as JSON`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to export store",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={store.name} searchBarPlaceholder={`Search keys in ${store.name}...`}>
      {keys.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Keys Found"
          description={`"${store.name}" doesn't have any keys yet. Press ⌘N to create one.`}
          icon={Icon.Key}
        />
      ) : (
        keys.map((keyName) => (
          <List.Item
            key={keyName}
            title={keyName}
            icon={Icon.Key}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Value"
                    target={<KVKeyDetail store={store} keyName={keyName} />}
                    icon={Icon.Eye}
                  />
                  <Action.Push
                    title="Edit Value"
                    target={<KVKeyForm store={store} keyName={keyName} onSaved={loadKeys} />}
                    icon={Icon.Pencil}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "e" },
                      Windows: { modifiers: ["ctrl"], key: "e" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Create">
                  <Action.Push
                    title="Create New Key"
                    target={<KVKeyForm store={store} onSaved={loadKeys} />}
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Key Name"
                    content={keyName}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Key"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteKey(keyName)}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Quick Access">
                  <Action
                    title="Export Store as JSON"
                    icon={Icon.Download}
                    onAction={handleExportStore}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "e" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                    }}
                  />
                  <Action
                    title="Refresh Keys"
                    icon={Icon.ArrowClockwise}
                    onAction={loadKeys}
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
