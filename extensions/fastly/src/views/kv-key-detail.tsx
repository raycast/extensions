import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { KVStore } from "../types";
import { getKVStoreKeyValue } from "../api";
import { useCachedPromise } from "@raycast/utils";
import { KVKeyForm } from "./kv-key-form";

interface KVKeyDetailProps {
  store: KVStore;
  keyName: string;
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

function buildCurlCommand(storeId: string, keyName: string): string {
  return `curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" "https://api.fastly.com/resources/stores/kv/${storeId}/keys/${encodeURIComponent(keyName)}"`;
}

export function KVKeyDetail({ store, keyName }: KVKeyDetailProps) {
  const {
    isLoading,
    data: value,
    revalidate,
  } = useCachedPromise(
    async (storeId: string, key: string) => {
      return getKVStoreKeyValue(storeId, key);
    },
    [store.id, keyName],
    {
      failureToastOptions: { title: "Failed to load value" },
    },
  );

  const { markdown, isJson } = value ? formatValue(value) : { markdown: "Loading...", isJson: false };

  const fullMarkdown = `# ${keyName}

**Store**: ${store.name}
**Type**: ${isJson ? "JSON" : "Text"}
${value !== undefined ? `**Size**: ${new Blob([value]).size} bytes` : ""}

---

${markdown}
`;

  return (
    <Detail
      markdown={fullMarkdown}
      isLoading={isLoading}
      navigationTitle={keyName}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Key" text={keyName} icon={Icon.Key} />
          <Detail.Metadata.Label title="Store" text={store.name} />
          <Detail.Metadata.Label title="Format" text={isJson ? "JSON" : "Text"} />
          {value !== undefined && <Detail.Metadata.Label title="Size" text={`${new Blob([value]).size} bytes`} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {value !== undefined && <Action.CopyToClipboard title="Copy Value" content={value} icon={Icon.Clipboard} />}
            <Action.Push
              title="Edit Value"
              target={<KVKeyForm store={store} keyName={keyName} onSaved={revalidate} />}
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
              content={keyName}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                Windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy as cURL Command"
              content={buildCurlCommand(store.id, keyName)}
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
