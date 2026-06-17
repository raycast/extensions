import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default function ViewConfig() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { isLoading, data: config, revalidate } = useCachedPromise(() => getPiholeAPI().getConfig());

  const jsonString = config ? JSON.stringify(config, null, 2) : "";
  const markdown = config ? "```json\n" + jsonString + "\n```" : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="View Configuration"
      markdown={markdown}
      actions={
        <ActionPanel title="Actions">
          <Action.CopyToClipboard title="Copy to Clipboard" content={jsonString} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
