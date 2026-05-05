import { List } from "@raycast/api";
import type { ComponentProps, ReactNode } from "react";

interface CommandErrorViewProps {
  actions?: ReactNode;
  description?: string;
  icon: ComponentProps<typeof List.EmptyView>["icon"];
  isLoading?: boolean;
  title: string;
}

export function CommandErrorView({ actions, description, icon, isLoading = false, title }: CommandErrorViewProps) {
  return (
    <List isLoading={isLoading}>
      <List.EmptyView icon={icon} title={title} description={description} actions={actions} />
    </List>
  );
}
