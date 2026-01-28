import { Action, ActionPanel } from "@raycast/api";

interface RefreshActionProps {
  onRefresh: () => void;
}

export function RefreshAction({ onRefresh }: RefreshActionProps) {
  return (
    <ActionPanel>
      <Action title="Refresh" onAction={onRefresh} />
    </ActionPanel>
  );
}
