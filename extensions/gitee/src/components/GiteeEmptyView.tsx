import { ActionPanel, List } from "@raycast/api";
import { ActionToGitee } from "./ActionToGitee";
import React from "react";

export function GiteeEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      icon={"empty-view-icon.svg"}
      title={title}
      actions={
        <ActionPanel>
          <ActionToGitee />
        </ActionPanel>
      }
    />
  );
}
