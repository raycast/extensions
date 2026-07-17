import { Action, Icon, Keyboard } from "@raycast/api";

interface CacheActionsProps {
  onRefresh: () => void;
}

export function CacheActions({ onRefresh }: CacheActionsProps) {
  return (
    <>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </>
  );
}
