import { Action, Icon, Keyboard } from "@raycast/api";

interface RefreshCacheActionProps {
  onRefresh: () => Promise<void>;
  onStop?: () => void;
  isFetchingBackground?: boolean;
}

export function RefreshCacheAction({ onRefresh, onStop, isFetchingBackground }: RefreshCacheActionProps) {
  if (isFetchingBackground && onStop) {
    return (
      <Action
        title="Stop Fetching"
        icon={Icon.XMarkCircle}
        onAction={onStop}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    );
  }

  return (
    <Action
      title="Refresh Cache"
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
