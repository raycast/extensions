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
import { ConfigStore, ConfigStoreItem } from "../types";
import { getConfigStoreItems, deleteConfigStoreItem } from "../api";
import { ConfigItemDetail } from "./config-item-detail";
import { ConfigItemForm } from "./config-item-form";

interface ConfigStoreItemsProps {
  store: ConfigStore;
}

function truncateValue(value: string, maxLen = 60): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen) + "...";
}

function isJsonValue(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

function buildCurlCommand(storeId: string): string {
  return `curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" "https://api.fastly.com/resources/stores/config/${storeId}/items"`;
}

export function ConfigStoreItems({ store }: ConfigStoreItemsProps) {
  const [items, setItems] = useState<ConfigStoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await getConfigStoreItems(store.id);
      setItems(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load config items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDeleteItem(item: ConfigStoreItem) {
    if (
      await confirmAlert({
        title: "Delete Config Item",
        message: `Are you sure you want to delete "${item.item_key}" from "${store.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteConfigStoreItem(store.id, item.item_key);
        await showToast({ style: Toast.Style.Success, title: "Item deleted", message: item.item_key });
        await loadItems();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete item",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleExportStore() {
    try {
      const exported: Record<string, string> = {};
      for (const item of items) {
        exported[item.item_key] = item.item_value;
      }
      const json = JSON.stringify(exported, null, 2);
      await Clipboard.copy(json);
      await showToast({
        style: Toast.Style.Success,
        title: "Config store exported",
        message: `${items.length} items copied to clipboard as JSON`,
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
    <List isLoading={isLoading} navigationTitle={store.name} searchBarPlaceholder={`Search items in ${store.name}...`}>
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Items Found"
          description={`"${store.name}" doesn't have any items yet. Press ${String.fromCharCode(8984)}N to create one.`}
          icon={Icon.Gear}
        />
      ) : (
        items.map((item) => {
          const isJson = isJsonValue(item.item_value);
          return (
            <List.Item
              key={item.item_key}
              title={item.item_key}
              subtitle={truncateValue(item.item_value)}
              icon={isJson ? Icon.CodeBlock : Icon.Text}
              keywords={[item.item_value]}
              accessories={[
                {
                  text: new Date(item.updated_at).toLocaleDateString(),
                  tooltip: "Last updated",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Detail"
                      target={<ConfigItemDetail store={store} itemKey={item.item_key} />}
                      icon={Icon.Eye}
                    />
                    <Action.Push
                      title="Edit Item"
                      target={<ConfigItemForm store={store} itemKey={item.item_key} onSaved={loadItems} />}
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Create">
                    <Action.Push
                      title="Create New Item"
                      target={<ConfigItemForm store={store} onSaved={loadItems} />}
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Value"
                      content={item.item_value}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "v" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "v" },
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Key Name"
                      content={item.item_key}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "c" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                      }}
                    />
                    <Action.CopyToClipboard
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Copy as cURL Command"
                      content={buildCurlCommand(store.id)}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "." },
                        Windows: { modifiers: ["ctrl", "shift"], key: "." },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Export">
                    <Action
                      title="Export Store as JSON"
                      icon={Icon.Download}
                      onAction={handleExportStore}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "e" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Danger Zone">
                    <Action
                      title="Delete Item"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteItem(item)}
                      shortcut={{
                        macOS: { modifiers: ["ctrl"], key: "x" },
                        Windows: { modifiers: ["ctrl"], key: "x" },
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Quick Access">
                    <Action
                      title="Refresh Items"
                      icon={Icon.ArrowClockwise}
                      onAction={loadItems}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
