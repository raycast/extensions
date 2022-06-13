import { ActionPanel, Grid } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView() {
  return (
    <Grid.EmptyView
      title={"No Icon"}
      icon={{ source: "empty-icon.svg" }}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
