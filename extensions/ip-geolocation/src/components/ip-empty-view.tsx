import { ActionPanel, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function IpEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={Icon.AirplaneTakeoff}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionOpenCommandPreferences />
            <ActionOpenExtensionPreferences />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
