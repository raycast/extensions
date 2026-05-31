import { ActionPanel, Grid, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ArcaneWallpaperEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={Icon.Image}
      title={"No wallpapers"}
      description={"Add Arcane wallpaper assets to finish setup."}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={Icon.Image}
      title={"No wallpapers"}
      description={"Add Arcane wallpaper assets to finish setup."}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
