import { ActionPanel, getPreferenceValues, Grid, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { Preferences } from "../types/preferences";

export function OpenLinkInEmptyView() {
  const { layout } = getPreferenceValues<Preferences>();
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "empty-icon.svg", dark: "empty-icon@dark.svg" } }}
      title={"No Application"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "empty-icon.svg", dark: "empty-icon@dark.svg" } }}
      title={"No Application"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
