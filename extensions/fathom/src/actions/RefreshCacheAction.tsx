import { Action, Icon } from "@raycast/api";

interface RefreshCacheActionProps {
  onRefresh: () => Promise<void>;
}

export function RefreshCacheAction({ onRefresh }: RefreshCacheActionProps) {
  return (
    <Action
      title="Refresh Cache"
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
