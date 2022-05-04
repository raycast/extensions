import { ActionPanel, List } from "@raycast/api";
import { ActionToGitee } from "./ActionToGitee";
import React from "react";

export function GiteeEmptyView() {
  return (
    <List.EmptyView
      icon={"empty-view-icon.png"}
      title={"Welcome to Gitee"}
      actions={
        <ActionPanel>
          <ActionToGitee />
        </ActionPanel>
      }
    />
  );
}
