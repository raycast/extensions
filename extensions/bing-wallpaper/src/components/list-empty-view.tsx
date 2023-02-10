import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";

export function ListEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={"No wallpapers"}
      description={""}
      actions={
        <ActionPanel>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
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
