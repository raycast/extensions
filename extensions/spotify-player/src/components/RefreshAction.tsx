import { Action, Icon } from "@raycast/api";

interface RefreshActionProps {
  onRefresh: () => void;
  simpleText?: boolean;
}

export function RefreshAction({ onRefresh, simpleText }: RefreshActionProps) {
  return (
    <Action
      icon={Icon.ArrowClockwise}
      title={simpleText ? "Refresh" : "Refresh Library"}
      onAction={onRefresh}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
