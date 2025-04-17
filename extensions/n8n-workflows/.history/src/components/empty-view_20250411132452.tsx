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
  
  // Helper function to determine if the node is an Action component
  const isAction = (node: React.ReactNode): boolean => {
    return React.isValidElement(node) &&
           (node.type === Action ||
            (typeof node.type === 'object' && node.type !== null && 'name' in node.type &&
             typeof node.type.name === 'string' && node.type.name.startsWith('Action')));
  };
  
  // Prepare the actions prop for List.EmptyView
  let finalActions: React.ReactNode = undefined;
  
  if (actions) {
    // If actions is already an ActionPanel, use it directly
    if (isActionPanel(actions)) {
      finalActions = actions;
    }
    // If it's a single Action component, wrap it in ActionPanel
    else if (isAction(actions)) {
      finalActions = <ActionPanel>{actions}</ActionPanel>;
    }
    // If it's a fragment or array of elements, wrap it in ActionPanel
    else if (React.isValidElement(actions)) {
      finalActions = <ActionPanel>{actions}</ActionPanel>;
    }
    // Otherwise, it might be something we can't handle, so log a warning
    else {
      console.warn("EmptyView received actions prop that couldn't be properly processed");
      finalActions = <ActionPanel><Action title="Fallback Action" /></ActionPanel>;
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
