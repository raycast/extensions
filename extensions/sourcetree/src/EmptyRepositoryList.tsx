import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { JSX } from "react";

export function EmptyRepositoryList(): JSX.Element {
  return (
    <List>
      <List.EmptyView
        icon={{ source: "sourcetree_128x128x32.png" }}
        title="Is Sourcetree installed?"
        description="Alternatively, locate Sourcetree's Plist file and set it in the preferences."
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
