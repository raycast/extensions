import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function PlaceholderEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "picsum-icon.svg", dark: "picsum-icon@dark.svg" } }}
      title={"No images"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "picsum-icon.svg", dark: "picsum-icon@dark.svg" } }}
      title={"No images"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
