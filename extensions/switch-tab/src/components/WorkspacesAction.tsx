import React from "react";
import { Action, Icon, Color } from "@raycast/api";
import { WorkspacesView } from "./WorkspacesView";
import { getActionShortcut } from "../helpers";

interface WorkspacesActionProps {
  browserFilter?: string;
}

export function WorkspacesAction({ browserFilter }: WorkspacesActionProps = {}) {
  // Edge Workspaces only apply to Edge browser
  if (browserFilter && browserFilter !== "all" && browserFilter !== "edge") {
    return null;
  }

  const icon = { source: Icon.Folder, tintColor: Color.Blue };

  return (
    <Action.Push
      title="Edge Workspaces"
      icon={icon}
      shortcut={getActionShortcut("workspaces") || { modifiers: ["shift"], key: "w" }}
      target={<WorkspacesView />}
    />
  );
}
