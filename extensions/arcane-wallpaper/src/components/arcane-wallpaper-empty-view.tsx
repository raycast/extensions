import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ArcaneWallpaperEmptyView(props: { layout: string; onRefresh: () => void }) {
  const { layout, onRefresh } = props;
  const description = "Wallpapers are temporarily unavailable. Please try again later.";
  const actions = (
    <ActionPanel>
      <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={onRefresh} />
      <ActionOpenPreferences />
    </ActionPanel>
  );

  return layout === "List" ? (
    <List.EmptyView icon={Icon.Image} title={"No wallpapers"} description={description} actions={actions} />
  ) : (
    <Grid.EmptyView icon={Icon.Image} title={"No wallpapers"} description={description} actions={actions} />
  );
}
