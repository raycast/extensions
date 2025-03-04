import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { layout } from "../types/preferences";

export function OpenLinkInEmptyView() {
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: "empty-icon.png" }}
      title={"No Browsers"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: "empty-icon.png" }}
      title={"No Browsers"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
