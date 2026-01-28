import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { GamePage, ServerType } from "./components/game-page";
import { LogMonitor } from "./modules/log-monitor";

function NotFound() {
  return (
    <Detail
      markdown={`# ⚠️ Error\nYou are not currently in a game.`}
      actions={
        <ActionPanel>
          <Action
            title="Favourite Games"
            icon={Icon.Star}
            onAction={() =>
              launchCommand({
                name: "favourite-games",
                type: LaunchType.UserInitiated,
              })
            }
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}

export default () => {
  const logMonitor = new LogMonitor();
  const currentGame = logMonitor.getGamePlaying();

  if (!currentGame) {
    return <NotFound />;
  }

  const { UniverseId: foundUniverseId } = currentGame;
  if (!foundUniverseId) {
    return <NotFound />;
  }

  let gameServerType: ServerType = "Regular";
  if (currentGame.ServerType == "Private") {
    gameServerType = "Private";
  } else if (currentGame.ServerType == "Reserved") {
    gameServerType = "Reserved";
  }

  const serverIP = currentGame.MachineAddress;

  return (
    <GamePage
      universeId={foundUniverseId}
      options={{
        timeJoined: currentGame.TimeJoined,
        serverIP,
        serverType: gameServerType,
      }}
    />
  );
};
