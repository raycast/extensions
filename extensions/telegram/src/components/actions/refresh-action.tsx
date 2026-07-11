import { Action, Icon } from "@raycast/api";

interface RefreshActionProps {
  onRefresh: () => void;
}

export function RefreshAction({ onRefresh }: RefreshActionProps) {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title="Refresh"
      onAction={onRefresh}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
