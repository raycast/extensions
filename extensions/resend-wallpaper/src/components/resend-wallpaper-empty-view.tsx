import { ActionPanel, Grid, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ResendWallpaperEmptyView(props: { layout: string }) {
  const { layout } = props;

  if (layout === "List") {
    return (
      <List.EmptyView
        icon={Icon.Box}
        title={"No wallpapers"}
        actions={
          <ActionPanel>
            <ActionOpenPreferences />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid.EmptyView
      icon={Icon.Box}
      title={"No wallpapers"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
