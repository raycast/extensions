import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
import { useGameDetails } from "./hooks/batch-game-details";
import { formatNumber } from "./modules/utils";

export default () => {
  const { gameId: enteredGameId } = getPreferenceValues<Preferences.FavouriteGamePlayers>();

  const gameId = Number(enteredGameId);
  if (!gameId) {
    return (
      <MenuBarExtra title="Invalid Game ID" icon={Icon.Warning}>
        <MenuBarExtra.Item title="Fix" onAction={() => openCommandPreferences()} />
      </MenuBarExtra>
    );
  }

  const { data, isLoading } = useGameDetails(gameId, false);

  let players = "...";
  if (!isLoading && data) {
    players = formatNumber(data.playing);
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.TwoPeople} title={players}>
      <MenuBarExtra.Item
        title="View Game"
        onAction={() =>
          launchCommand({
            name: "get-game-with-id",
            arguments: {
              universeId: gameId.toString(),
            },
            type: LaunchType.UserInitiated,
          })
        }
      />
    </MenuBarExtra>
  );
};
