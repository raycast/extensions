import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useGameDetails } from "./hooks/game-details";
import { formatNumber } from "./modules/utils";
import { generateGameStartLink, generateGameStudioLink } from "./modules/roblox-links";

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

  function openLink(linkType: "play" | "edit") {
    if (!data || isLoading) {
      return showHUD("Still loading!");
    }

    if (linkType === "play") {
      const gameDeeplink = generateGameStartLink(data.rootPlaceId);
      open(gameDeeplink);
    } else if (linkType === "edit") {
      const studioDeeplink = generateGameStudioLink(data.rootPlaceId);
      open(studioDeeplink);
    }
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.TwoPeople} title={players}>
      <MenuBarExtra.Item
        title="View Game"
        onAction={() =>
          launchCommand({
            name: "show-game",
            arguments: {
              universeId: gameId.toString(),
            },
            type: LaunchType.UserInitiated,
          })
        }
      />
      <MenuBarExtra.Item title="Play Game" onAction={() => openLink("play")} />
      <MenuBarExtra.Item title="Edit Game" onAction={() => openLink("edit")} />
    </MenuBarExtra>
  );
};
