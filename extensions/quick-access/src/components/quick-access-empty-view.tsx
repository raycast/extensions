import { ActionPanel, Grid, Icon, List } from "@raycast/api";
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
      icon={Icon.Finder}
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
      icon={Icon.Finder}
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
