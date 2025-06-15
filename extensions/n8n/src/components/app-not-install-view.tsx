import { Action, ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function AppNotInstallView(props: { extensionPreferences: boolean }) {
  const { extensionPreferences } = props;
  return (
    <List.EmptyView
      title={"n8n Not Installed"}
      description={"n8n is not installed on your Mac. Please install n8n to use this command."}
      icon={{ source: "app-not-install-icon.png" }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title={"Get n8n"}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            url={"https://n8n.io/get-started/"}
          />
          {extensionPreferences && <ActionOpenPreferences />}
        </ActionPanel>
      }
    />
  );
}
