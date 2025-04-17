import { ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react"; // Import React for ReactNode type

export function EmptyView(props: { title: string; extensionPreferences: boolean; actions?: React.ReactNode }) {
  const { title, extensionPreferences, actions } = props;
  console.log("EmptyView title:", title); // Add this line
  
  // Helper function to determine if the actions is already an ActionPanel
  const isActionPanel = (node: React.ReactNode): boolean => {
    return React.isValidElement(node) && node.type === ActionPanel;
  };
  
  return (
    <List.EmptyView
      title={title ?? "No Title"}
      icon={"empty-icon.png"}
      // Render provided actions if available, otherwise default to preferences action if needed
      actions={
        actions 
          ? (isActionPanel(actions) ? actions : <ActionPanel>{actions}</ActionPanel>)
          : (extensionPreferences ? <ActionPanel><ActionOpenPreferences /></ActionPanel> : undefined)
      }
    />
  );
}
