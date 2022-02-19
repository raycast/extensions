import { ActionPanel, Color, Icon } from "@raycast/api";

export function RefreshPipelinesAction(props: { onRefreshPipelines?: () => void }): JSX.Element {
  const handle = () => {
    if (props.onRefreshPipelines) {
      props.onRefreshPipelines();
    }
  };
  return (
    <ActionPanel.Item
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={handle}
    />
  );
}
