import { Action, Icon, Keyboard } from "@raycast/api";

export default function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
