import { ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";

export function PexelsEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={"empty-view-icon.png"}
      actions={
        <ActionPanel>
          <ActionToPexels />
        </ActionPanel>
      }
    />
  );
}
