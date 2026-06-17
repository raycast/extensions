import { ActionPanel, Grid } from "@raycast/api";
import React from "react";
import { ActionSettings } from "./action-settings";

export function EmptyView() {
  return (
    <Grid.EmptyView
      title={"No Icon"}
      icon={{ source: "empty-icon.png" }}
      actions={
        <ActionPanel>
          <ActionSettings />
        </ActionPanel>
      }
    />
  );
}
