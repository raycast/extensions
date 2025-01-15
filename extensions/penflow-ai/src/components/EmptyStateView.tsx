import React from "react";
import { List, Icon } from "@raycast/api";

export function EmptyStateView() {
  return (
    <List.EmptyView
      icon={Icon.Text}
      title="Start Writing"
      description="Type English or Chinese to get suggestions"
    />
  );
}
