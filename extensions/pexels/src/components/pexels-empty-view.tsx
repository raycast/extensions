import { Action, ActionPanel, Grid, Icon, List, openExtensionPreferences } from "@raycast/api";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";

export function PexelsEmptyView(props: { title: string; layout: string }) {
  const { title, layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      title={title}
      icon={"empty-view-icon.svg"}
      actions={
        <ActionPanel>
          <ActionToPexels />
          <ActionPanel.Section>
            <Action
              icon={Icon.Gear}
              title="Open Extension Preferences"
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      title={title}
      icon={"empty-view-icon.svg"}
      actions={
        <ActionPanel>
          <ActionToPexels />
          <ActionPanel.Section>
            <Action
              icon={Icon.Gear}
              title="Open Extension Preferences"
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
