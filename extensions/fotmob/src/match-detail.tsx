import type { LaunchProps } from "@raycast/api";
import { Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import MatchDetailView from "@/views/match/MatchDetailView";

interface MatchDetailArguments {
  matchId: string;
}

export default function Command(props: LaunchProps<{ arguments: MatchDetailArguments }>) {
  const { matchId } = props.arguments;

  const { pop } = useNavigation();

  // Validate matchId empty or not a number
  if (!matchId || Number.isNaN(Number(matchId))) {
    showToast({
      title: "Match ID must be a number",
      message: "Please enter a valid match ID",
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
        <List.EmptyView icon={Icon.XMarkCircleFilled} description="Match ID must be a number" />
      </List>
    );
  }

  return <MatchDetailView matchId={matchId} />;
}
