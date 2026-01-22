import { Action, ActionPanel, Icon } from "@raycast/api";

interface UsageActionPanelProps {
  onRefresh: () => void;
  onLogOut: () => void;
}

export function UsageActionPanel({ onRefresh, onLogOut }: Readonly<UsageActionPanelProps>) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      <Action title="Log out" icon={Icon.Logout} onAction={onLogOut} />
    </ActionPanel>
  );
}
