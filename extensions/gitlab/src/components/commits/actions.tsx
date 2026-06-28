import { Action, Color, Icon } from "@raycast/api";

export function RefreshCommitsAction(props: { onRefreshJobs?: () => void }) {
  const handle = () => {
    if (props.onRefreshJobs) {
      props.onRefreshJobs();
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
