import { Action, Icon } from "@raycast/api";

export function ToggleDetailsAction(props: { isShowingDetail: boolean; setShowingDetail: (show: boolean) => void }) {
  return (
    <Action
      icon={Icon.Sidebar}
      title={props.isShowingDetail ? "Hide Details" : "Show Details"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={() => props.setShowingDetail(!props.isShowingDetail)}
    />
  );
}
