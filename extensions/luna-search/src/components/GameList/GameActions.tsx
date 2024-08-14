import { Action, ActionPanel, Icon, open } from "@raycast/api";
import { LunaGame } from "../../services";
import { DISPLAY_VALUES } from "../../constants";

/**
 * The key used to identify the Google Chrome application.
 */
const CHROME_KEY = "com.google.Chrome";

/**
 * Defines the props for the GameActions component.
 */
interface Props {
  game: LunaGame;
}

/**
 * The GameActions component is responsible for rendering the actions
 * available for a specific game, such as opening the game's URL,
 * launching the game, and copying the game's raw URL.
 *
 * It receives the following props:
 * - game: The LunaGame instance to display the actions for.
 *
 * The component uses the ActionPanel and Action components from the
 * Raycast API to render the available actions. If the game has a
 * playUrl, an additional "Launch Game" action is displayed.
 */
export function GameActions({ game }: Props): JSX.Element {
  return (
    <ActionPanel>
      <Action
        title={DISPLAY_VALUES.openTitle}
        icon={Icon.Globe}
        onAction={async () => {
          await open(game.openUrl, CHROME_KEY);
        }}
      />
      {game.playUrl ? (
        <Action
          title={DISPLAY_VALUES.launchGame}
          icon={Icon.Play}
          onAction={async () => {
            await open(game.playUrl ?? "", CHROME_KEY);
          }}
        />
      ) : (
        <></>
      )}
      <Action.CopyToClipboard
        title={DISPLAY_VALUES.copyTitle}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        content={game.rawUrl}
      />
    </ActionPanel>
  );
}
