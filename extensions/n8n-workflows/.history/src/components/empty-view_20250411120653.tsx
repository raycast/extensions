import { ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react"; // Import React for ReactNode type

export function EmptyView(props: { title: string; extensionPreferences: boolean; actions?: React.ReactNode }) {
  const { title, extensionPreferences, actions } = props;
  return (
    <List.EmptyView
      title={title}
      icon={"empty-icon.png"}
      // Render provided actions if available, otherwise default to preferences action if needed
      actions={actions ? <ActionPanel>{actions}</ActionPanel> : (extensionPreferences ? <ActionPanel><ActionOpenPreferences /></ActionPanel> : undefined)}
    />
  );
}
