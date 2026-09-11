import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { ConfigStore } from "../types";
import { getConfigStoreItem } from "../api";
import { useCachedPromise } from "@raycast/utils";
import { ConfigItemForm } from "./config-item-form";

interface ConfigItemDetailProps {
  store: ConfigStore;
  itemKey: string;
}

function formatValue(value: string): { markdown: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(value);
    const formatted = JSON.stringify(parsed, null, 2);
    return { markdown: `\`\`\`json\n${formatted}\n\`\`\``, isJson: true };
  } catch {
    return { markdown: `\`\`\`\n${value}\n\`\`\``, isJson: false };
  }
}

function buildCurlCommand(storeId: string, key: string): string {
  return `curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" "https://api.fastly.com/resources/stores/config/${storeId}/item/${encodeURIComponent(key)}"`;
}

export function ConfigItemDetail({ store, itemKey }: ConfigItemDetailProps) {
  const {
    isLoading,
    data: item,
    revalidate,
  } = useCachedPromise(
    async (storeId: string, key: string) => {
      return getConfigStoreItem(storeId, key);
    },
    [store.id, itemKey],
    {
      failureToastOptions: { title: "Failed to load config item" },
    },
  );

  const value = item?.item_value;
  const { markdown, isJson } = value ? formatValue(value) : { markdown: "Loading...", isJson: false };

  const fullMarkdown = `# ${itemKey}

**Store**: ${store.name}
**Type**: ${isJson ? "JSON" : "Text"}
${value !== undefined ? `**Size**: ${new Blob([value]).size} bytes` : ""}
${item ? `**Updated**: ${new Date(item.updated_at).toLocaleString()}` : ""}

---

${markdown}
`;

  return (
    <Detail
      markdown={fullMarkdown}
      isLoading={isLoading}
      navigationTitle={itemKey}
      metadata={
        item ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Key" text={itemKey} icon={Icon.Gear} />
            <Detail.Metadata.Label title="Store" text={store.name} />
            <Detail.Metadata.Label title="Format" text={isJson ? "JSON" : "Text"} />
            <Detail.Metadata.Label title="Size" text={`${new Blob([item.item_value]).size} bytes`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Created" text={new Date(item.created_at).toLocaleString()} />
            <Detail.Metadata.Label title="Updated" text={new Date(item.updated_at).toLocaleString()} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {value !== undefined && <Action.CopyToClipboard title="Copy Value" content={value} icon={Icon.Clipboard} />}
            <Action.Push
              title="Edit Item"
              target={<ConfigItemForm store={store} itemKey={itemKey} onSaved={revalidate} />}
              icon={Icon.Pencil}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "e" },
                Windows: { modifiers: ["ctrl"], key: "e" },
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Key Name"
              content={itemKey}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy as cURL Command"
              content={buildCurlCommand(store.id, itemKey)}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "." },
                Windows: { modifiers: ["ctrl", "shift"], key: "." },
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Access">
            <Action
              title="Refresh Value"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
