import type { LaunchProps } from "@raycast/api";
import { Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import LeagueTableView from "@/views/league/LeagueTableView";

interface LeagueTableArguments {
  leagueId: string;
}

export default function Command(props: LaunchProps<{ arguments: LeagueTableArguments }>) {
  const { leagueId } = props.arguments;

  const { pop } = useNavigation();

  // Validate leagueId empty or not a number
  if (!leagueId || Number.isNaN(Number(leagueId))) {
    showToast({
      title: "League ID must be a number",
      message: "Please enter a valid league ID",
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
        <List.EmptyView icon={Icon.XMarkCircleFilled} description="League ID must be a number" />
      </List>
    );
  }

  return <LeagueTableView leagueId={leagueId} />;
}
