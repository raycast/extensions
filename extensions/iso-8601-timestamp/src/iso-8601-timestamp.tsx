import { Action, ActionPanel, Icon, List, Clipboard, showHUD, popToRoot } from "@raycast/api";
import { useEffect } from "react";

export default function Command() {
  useEffect(() => {
    async function copyTimestamp() {
      const timestamp = new Date().toISOString();
      await Clipboard.copy(timestamp);
      await showHUD("ISO 8601 timestamp copied to clipboard");
      await popToRoot();
    }
    copyTimestamp();
  }, []);

  return (
    <List>
      <List.Item
        title="Copy ISO 8601 Timestamp"
        icon={Icon.CopyClipboard}
        actions={
          <ActionPanel>
            <Action title="Dismiss" onAction={() => popToRoot()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
