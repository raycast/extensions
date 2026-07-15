import type { LaunchProps } from "@raycast/api";
import { Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import PlayerView from "@/views/player/PlayerView";

interface PlayerArguments {
  playerId: string;
}

export default function Command(props: LaunchProps<{ arguments: PlayerArguments }>) {
  const { playerId } = props.arguments;

  const { pop } = useNavigation();

  // Validate playerId empty or not a number
  if (!playerId || Number.isNaN(Number(playerId))) {
    showToast({
      title: "Player ID must be a number",
      message: "Please enter a valid player ID",
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
        <List.EmptyView icon={Icon.XMarkCircleFilled} description="Player ID must be a number" />
      </List>
    );
  }

  return <PlayerView id={playerId} />;
}
