import React from "react";
import { List, Icon } from "@raycast/api";

interface EmptyStateViewProps {
  icon?: Icon;
  title?: string;
  description?: string;
}

export function EmptyStateView({
  icon = Icon.Text,
  title = "开始输入",
  description = "输入英文或中文以获取建议"
}: EmptyStateViewProps) {
  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
    />
  );
}
