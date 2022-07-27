import { ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";

export function IpEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={{ source: { light: "empty-view.svg", dark: "empty-view@dark.svg" } }}
      actions={
        <ActionPanel>
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}
