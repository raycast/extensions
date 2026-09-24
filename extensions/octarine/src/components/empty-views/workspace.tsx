import { Action, ActionPanel, Icon, openExtensionPreferences, List } from "@raycast/api";
import type { ReactNode } from "react";

function props(children?: ReactNode) {
  return {
    title: "No Octarine Workspaces Found",
    description:
      "Check Workspace Root Paths in extension preferences. A valid workspace must contain a .octarine folder.",
    actions: (
      <ActionPanel>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        {children}
      </ActionPanel>
    ),
  };
}

export function WorkspaceListEmptyView({ children }: { children?: ReactNode }) {
  return <List.EmptyView {...props(children)} />;
}
