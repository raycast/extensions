import { Action, ActionPanel, Icon, Keyboard, open, useNavigation } from "@raycast/api";
import { GameSummary } from "../services";
import { DISPLAY_VALUES } from "../constants";
import { GameDetail } from "./GameDetail";

/**
 * The key used to identify the Google Chrome application.
 */
const CHROME_KEY = "com.google.Chrome";

/**
 * Defines the props for the GameActions component.
 */
interface Props {
  game: GameSummary;
  isDetailEnabled?: boolean;
  searchCallback?: (query: string) => void;
}

/**
 * The GameActions component is responsible for rendering the actions
 * available for a specific game, such as opening the game's URL or Details,
 * launching the game, and copying the game's raw URL.
 *
 * It receives the following props:
 * - game: The GameSummary instance to display the actions for.
 * - detailServiceToken: An optional detail service token, which can be used to get details about a game.
 * - searchCallback: Triggers a search, optional - void method provided by default.
 *
 * The component uses the ActionPanel and Action components from the
 * Raycast API to render the available actions. If the game has a
 * playUrl, an additional "Launch Game" action is displayed.
 */
export function GameActions({ game, isDetailEnabled, searchCallback = () => {} }: Props): JSX.Element {
  const { pop, push } = useNavigation();

  // From a detail perspective, searching means triggering the parent search, and returning to it.
  const handleSearch = (query: string) => {
    searchCallback(query);
    pop();
  };

  return (
    <ActionPanel>
      {isDetailEnabled ? (
        // For Detail Enabled action areas, show the "see details" as the default action
        <Action
          title={DISPLAY_VALUES.seeDetailsTitle}
          icon={Icon.Book}
          onAction={() => {
            push(<GameDetail game={game} searchCallback={handleSearch} />);
          }}
        />
      ) : (
        // Otherwise, defer into Chrome.
        <Action
          title={DISPLAY_VALUES.openTitle}
          icon={Icon.Globe}
          onAction={async () => {
            await open(game.openUrl, CHROME_KEY);
          }}
        />
      )}
      {game.playUrl ? (
        <Action
          title={DISPLAY_VALUES.launchGame}
          icon={Icon.GameController}
          onAction={async () => {
            await open(game.playUrl ?? "", CHROME_KEY);
          }}
        />
      ) : (
        <></>
      )}
      <Action.CopyToClipboard
        title={DISPLAY_VALUES.copyTitle}
        shortcut={Keyboard.Shortcut.Common.Copy}
        content={game.rawUrl}
      />
    </ActionPanel>
  );
}
