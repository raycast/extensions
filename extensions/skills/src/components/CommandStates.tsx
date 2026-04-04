import { Action, Detail, Icon, List } from "@raycast/api";
import type { ComponentProps } from "react";

type RetryActionProps = {
  onAction: () => void;
  title?: string;
};

export function RetryAction({ onAction, title = "Retry" }: RetryActionProps) {
  return <Action title={title} onAction={onAction} icon={Icon.RotateClockwise} />;
}

type CommandErrorDetailProps = {
  title: string;
  message: string;
  detailsMarkdown: string;
  actions?: ComponentProps<typeof Detail>["actions"];
};

export function CommandErrorDetail({ title, message, detailsMarkdown, actions }: CommandErrorDetailProps) {
  return <Detail markdown={`# ${title}\n\n**Error:** ${message}\n\n---\n\n${detailsMarkdown}`} actions={actions} />;
}

type CommandEmptyViewProps = {
  title: string;
  description: string;
  icon: Icon;
  actions?: ComponentProps<typeof List.EmptyView>["actions"];
};

export function CommandEmptyView({ title, description, icon, actions }: CommandEmptyViewProps) {
  return <List.EmptyView title={title} description={description} icon={icon} actions={actions} />;
}
