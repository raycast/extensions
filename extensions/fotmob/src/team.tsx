import { Icon, LaunchProps, List, Toast, showToast, useNavigation } from "@raycast/api";
import TeamView from "./views/team/TeamView";

export default function Command(props: LaunchProps<{ arguments: Arguments.Team }>) {
  const { teamId } = props.arguments;

  const { pop } = useNavigation();

  // Validate teamId empty or not a number
  if (!teamId || isNaN(Number(teamId))) {
    showToast({
      title: "Team ID must be a number",
      message: "Please enter a valid team ID",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Retry",
        onAction: () => {
          pop();
        },
      },
    });

    return (
      <List>
        <List.EmptyView icon={Icon.XMarkCircleFilled} description="Team ID must be a number" />
      </List>
    );

    return null;
  }

  return <TeamView id={teamId} />;
}
