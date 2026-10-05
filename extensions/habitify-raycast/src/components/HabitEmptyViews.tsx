import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import type { Image } from "@raycast/api";

type HabitLoadErrorEmptyViewProps = {
  error: string;
  onRetry: () => void;
  title?: string;
};

export function HabitLoadErrorEmptyView({
  error,
  onRetry,
  title = "Unable to load Habitify",
}: HabitLoadErrorEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={title}
      description={error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action title="Retry" onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}

type HabitEmptyStateViewProps = {
  icon: Image.ImageLike;
  title: string;
  description: string;
  onRefresh: () => void;
};

export function HabitEmptyStateView({ icon, title, description, onRefresh }: HabitEmptyStateViewProps) {
  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
