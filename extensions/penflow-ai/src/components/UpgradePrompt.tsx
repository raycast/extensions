import React from "react";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { CONFIG } from "../config/constants";

export function UpgradePrompt() {
  return (
    <List.Item
      icon={Icon.Stars}
      title="Get Raycast Pro to Use Penflow"
      subtitle="Press Enter or Click to Upgrade"
      keywords={["pro", "upgrade", "raycast"]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Upgrade to Raycast Pro"
            icon={Icon.Link}
            url={CONFIG.URLS.UPGRADE}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}
