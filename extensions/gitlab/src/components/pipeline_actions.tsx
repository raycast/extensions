import { Action, Color, Icon } from "@raycast/api";

export function RefreshPipelinesAction(props: { onRefreshPipelines?: () => void }): JSX.Element {
  const handle = () => {
    if (props.onRefreshPipelines) {
      props.onRefreshPipelines();
    }
  };
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={handle}
    />
  );
}
