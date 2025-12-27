import { Action, Icon, Keyboard } from "@raycast/api";

interface RefreshCacheActionProps {
  onRefresh: () => Promise<void>;
}

export function RefreshCacheAction({ onRefresh }: RefreshCacheActionProps) {
  return (
    <Action
      title="Refresh Cache"
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
