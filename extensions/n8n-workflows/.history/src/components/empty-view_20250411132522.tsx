import { Action, ActionPanel, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import React from "react"; // Import React for ReactNode type

export function EmptyView(props: { title: string; extensionPreferences: boolean; actions?: React.ReactNode }) {
  const { title, extensionPreferences, actions } = props;
  console.log("EmptyView title:", title);
  
  // Helper function to determine if the node is already an ActionPanel
  const isActionPanel = (node: React.ReactNode): boolean => {
    return React.isValidElement(node) && node.type === ActionPanel;
  };
  
  // Prepare the actions prop for List.EmptyView
  let finalActions: React.ReactNode = undefined;
  
  if (actions) {
    // If actions is already an ActionPanel, use it directly
    if (isActionPanel(actions)) {
      finalActions = actions;
    }
    // Otherwise, wrap it in ActionPanel to ensure proper structure
    else {
      try {
        finalActions = <ActionPanel>{actions}</ActionPanel>;
      } catch (error) {
        console.error("Error wrapping actions in ActionPanel:", error);
        // Fallback to a safe default
        finalActions = <ActionPanel><Action title="Fallback Action" /></ActionPanel>;
      }
    }
  }
  // If no actions provided but extensionPreferences is true, use default ActionOpenPreferences
  else if (extensionPreferences) {
    finalActions = <ActionPanel><ActionOpenPreferences /></ActionPanel>;
  }
  
  return (
    <List.EmptyView
      title={title ?? "No Title"}
      icon={"empty-icon.png"}
      actions={finalActions}
    />
  );
}
