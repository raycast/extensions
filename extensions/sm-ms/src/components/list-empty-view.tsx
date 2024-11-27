import { ActionPanel, Icon, List } from "@raycast/api";
import React from "react";
import { ActionOpenExtensionPreferences } from "./action-open-extension-preferences";
import { ActionToSmMs } from "./action-to-sm-ms";

export function ListEmptyView(props: { icon: Icon; title: string }) {
  const { icon, title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionToSmMs />
          <ActionOpenExtensionPreferences />
        </ActionPanel>
      }
    />
  );
}
