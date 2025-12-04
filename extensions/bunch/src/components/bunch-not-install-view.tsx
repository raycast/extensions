import { Action, ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function BunchNotInstallView(props: { extensionPreferences: boolean }) {
  const { extensionPreferences } = props;
  return (
    <List.EmptyView
      title={"Bunch Not Installed"}
      description={"Bunch is not installed on your Mac. Please install Bunch to use this command."}
      icon={{ source: "not-installed-icon.svg" }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={"Get Bunch"}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            url={"https://bunchapp.co/download/"}
          />
          {extensionPreferences && <ActionOpenPreferences />}
        </ActionPanel>
      }
    />
  );
}
