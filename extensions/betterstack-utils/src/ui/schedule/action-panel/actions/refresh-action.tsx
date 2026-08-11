import { Action, Icon, Keyboard } from "@raycast/api";

type RefreshActionProps = {
  onRefresh: () => void;
};

export function RefreshAction({ onRefresh }: RefreshActionProps) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
