import { ActionPanel, Grid, List } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";
import { layout } from "../types/preferences";

export function AutoQuitAppEmptyView() {
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: "empty-view-icon.png" }}
      title={"No App"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: "empty-view-icon.png" }}
      title={"No App"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
