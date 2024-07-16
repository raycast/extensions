import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { Layout } from "../types/types";
import { ActionLaunchPin } from "./action-launch-pin";
import { ActionConfigureCommand } from "./action-configure-command";

export function QuickAccessEmptyView(props: { layout: string }) {
  const title = "No Files";
  const description = "You can pin files or folders with Pin command";
  const { layout } = props;
  return layout === Layout.GRID ? (
    <Grid.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <ActionLaunchPin />
          <ActionConfigureCommand />
        </ActionPanel>
      }
    />
  ) : (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <ActionLaunchPin />
          <ActionConfigureCommand />
        </ActionPanel>
      }
    />
  );
}
