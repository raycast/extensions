import { ActionPanel, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ListEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={Icon.Clock}
      actions={
        <ActionPanel>
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
