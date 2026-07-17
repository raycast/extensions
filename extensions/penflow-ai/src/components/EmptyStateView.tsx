import React from "react";
import { List, Icon } from "@raycast/api";

interface EmptyStateViewProps {
  icon?: Icon;
  title?: string;
  description?: string;
}

export function EmptyStateView({
  icon = Icon.Text,
  title = "Start Typing",
  description = "Type English or Chinese text to get suggestions",
}: EmptyStateViewProps) {
  return <List.EmptyView icon={icon} title={title} description={description} />;
}
