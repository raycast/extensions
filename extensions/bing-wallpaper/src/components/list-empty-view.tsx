import { ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";

export function ListEmptyView() {
  return (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={"No wallpapers"}
      description={""}
      actions={
        <ActionPanel>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}
