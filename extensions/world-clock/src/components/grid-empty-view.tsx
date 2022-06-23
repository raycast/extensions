import { ActionPanel, Grid, Icon } from "@raycast/api";
import React from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function GridEmptyView(props: { title: string; command: boolean; extension: boolean }) {
  const { title, command, extension } = props;
  return (
    <Grid.EmptyView
      title={title}
      icon={{ source: { light: "timezone-empty-icon.svg", dark: "timezone-empty-icon@dark.svg" } }}
      actions={
        <ActionPanel>
          <ActionOpenCommandPreferences command={command} extension={extension} />
        </ActionPanel>
      }
    />
  );
}
