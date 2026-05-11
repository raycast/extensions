import { ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ListEmptyView() {
  return (
    <List.EmptyView
      title={"No Hidden Files"}
      icon={{ source: "empty-view-icon.png" }}
      actions={
        <ActionPanel>
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
