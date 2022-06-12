import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function RaycastWallpaperEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: "raycast-empty-view-icon.svg" }}
      title={"No pictures"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: "raycast-empty-view-icon.svg" }}
      title={"No pictures"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
