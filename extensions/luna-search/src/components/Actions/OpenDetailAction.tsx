import { Action, Icon, useNavigation } from "@raycast/api";
import { SearchCallback, SearchInput } from "../..";
import { DISPLAY_VALUES } from "../../constants";
import { GameDetail } from "../GameDetail";
import { GameSummary } from "../../models";
import { useRecents } from "../../hooks/UseRecents";

/**
 * Defines the shape of the props for the OpenDetailAction component.
 */
interface Props {
  /**
   * The GameSummary instance to display the details for.
   */
  game: GameSummary;

  /**
   * A callback function to execute a search.
   */
  searchCallback: SearchCallback;
}

/**
 * A React component that renders an Action to open the details of a game.
 * When the action is triggered, it navigates to the GameDetail component and passes the game information and a search callback.
 *
 * @param props The props for the component, including the game information and a search callback.
 * @returns A JSX.Element representing the OpenDetailAction component.
 */
export function OpenDetailAction({ game, searchCallback }: Props): JSX.Element {
  const [, , addGame] = useRecents();
  /**
   * Retrieves the `pop` and `push` functions from the Raycast navigation API.
   * The `pop` function can be used to navigate back to the previous view, and the `push` function can be used to navigate to a new view.
   */
  const { pop, push } = useNavigation();

  /**
   * Handles the search callback when the GameDetail component needs to perform a search.
   * It calls the provided searchCallback function with the input, and then navigates back to the previous view.
   *
   * @param input The search input to be used in the search callback.
   */
  const gameDetailSearchHandler = (input: SearchInput) => {
    searchCallback(input);
    pop();
  };

  /**
   * Creates the GameDetail component with the game information and the gameDetailSearchHandler function.
   */
  const gameDetailComponent = <GameDetail game={game} searchCallback={gameDetailSearchHandler} />;

  return (
    <Action
      icon={Icon.Book}
      onAction={() => {
        addGame(game);
        push(gameDetailComponent);
      }}
      title={DISPLAY_VALUES.seeDetailsTitle}
    />
  );
}
