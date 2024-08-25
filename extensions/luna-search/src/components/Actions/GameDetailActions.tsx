import { ActionPanel, Icon, useNavigation } from "@raycast/api";
import { GameSummary } from "../../models";
import { DISPLAY_VALUES } from "../../constants";
import { SearchCallback, SearchInput } from "../..";
import { OpenUrlAction } from "./OpenUrlAction";
import { getCommonGameActions } from "./CommonGameActions";

/**
 * Defines the props for the GameActions component.
 */
interface Props {
  game: GameSummary;
  searchCallback: SearchCallback;
}

/**
 * A React component that renders an Action to open the game's URL in the browser.
 *
 * @param url The game's URL to open.
 * @returns A JSX.Element representing the OpenGameInBrowserAction component.
 */
function OpenGameInBrowserAction({ url }: { url: string }) {
  return <OpenUrlAction icon={Icon.Globe} title={DISPLAY_VALUES.openTitle} url={url} />;
}

/**
 * The GameActions component is responsible for rendering the actions
 * available for a specific game, such as opening the game's URL or Details,
 * launching the game, and copying the game's raw URL.
 *
 * It receives the following props:
 * - game: The GameSummary instance to display the actions for.
 * - searchCallback: Triggers a search, optional - void method provided by default.
 *
 * The component uses the ActionPanel and Action components from the
 * Raycast API to render the available actions. If the game has a
 * playUrl, an additional "Launch Game" action is displayed.
 */
export function GameDetailActions({ game, searchCallback }: Props): JSX.Element {
  /**
   * Retrieves the `pop` function from the Raycast navigation API.
   * This function can be used to navigate back to the previous view.
   */
  const { pop } = useNavigation();

  /**
   * Invokes a search and traverses to the previous screen to view the results.
   */
  function onSearch(query: SearchInput) {
    searchCallback(query);
    pop();
  }

  return (
    <ActionPanel>
      <OpenGameInBrowserAction url={game.openUrl} />
      {...getCommonGameActions(game, onSearch)}
    </ActionPanel>
  );
}
