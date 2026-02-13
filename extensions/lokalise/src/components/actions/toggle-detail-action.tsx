import { Action, Icon } from "@raycast/api";

interface ToggleDetailActionProps {
  isShowingDetail: boolean;
  onToggle: () => void;
}

export function ToggleDetailAction({ isShowingDetail, onToggle }: ToggleDetailActionProps) {
  return (
    <Action
      icon={isShowingDetail ? Icon.AppWindowSidebarLeft : Icon.AppWindowSidebarRight}
      title={isShowingDetail ? "Hide Details" : "Show Details"}
      onAction={onToggle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    />
  );
}
