import React from "react";
import { List, Icon } from "@raycast/api";

interface EmptyStateViewProps {
  hasAIPro: boolean | null;
}

export function EmptyStateView({ hasAIPro }: EmptyStateViewProps) {
  return (
    <List.EmptyView
      icon={Icon.Text}
      title="Start Writing"
      description={`Type English or Chinese to get suggestions\n${hasAIPro !== null
          ? hasAIPro
            ? "Raycast Pro Activated"
            : "Raycast Pro Required"
          : "Checking Raycast Pro access..."
        }`}
    />
  );
}
