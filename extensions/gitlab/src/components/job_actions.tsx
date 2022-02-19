import { ActionPanel, Color, Icon } from "@raycast/api";

export function RefreshJobsAction(props: { onRefreshJobs?: () => void }): JSX.Element {
  const handle = () => {
    if (props.onRefreshJobs) {
      props.onRefreshJobs();
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
