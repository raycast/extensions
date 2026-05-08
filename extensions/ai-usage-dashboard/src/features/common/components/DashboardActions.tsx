import { Action, ActionPanel } from "@raycast/api";

type DashboardActionsProps = {
  onCopyRawJson: () => void;
  onOpenPreferences: () => void;
  onRefresh: () => void;
};

export const DashboardActions = ({
  onCopyRawJson,
  onOpenPreferences,
  onRefresh,
}: DashboardActionsProps) => (
  <ActionPanel>
    <Action
      title="Refresh"
      onAction={onRefresh}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
    <Action
      title="Copy Raw JSON"
      onAction={onCopyRawJson}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
    <Action title="Open Preferences" onAction={onOpenPreferences} />
  </ActionPanel>
);
