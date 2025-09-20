import { ActionPanel } from "@raycast/api";
import { GameSummary } from "../../models";
import { SearchCallback } from "../..";
import { OpenDetailAction } from "./OpenDetailAction";
import { getCommonGameActions } from "./CommonGameActions";

/**
 * Defines the props for the GameActions component.
 */
interface Props {
  game: GameSummary;
  searchCallback: SearchCallback;
}

/**
 * The GameActions component is responsible for rendering the actions
 * available for a specific game, such as opening the game's URL or Details,
 * launching the game, and copying the game's raw URL.
 *
 * It receives the following props:
 * - game: The GameSummary instance to display the actions for.
 * - isInDetail: An optional value to enable a "see game details" as the primary action.
 * - searchCallback: Triggers a search, optional - void method provided by default.
 *
 * The component uses the ActionPanel and Action components from the
 * Raycast API to render the available actions. If the game has a
 * playUrl, an additional "Launch Game" action is displayed.
 */
export function GameGridActions({ game, searchCallback }: Props): JSX.Element {
  return (
    <ActionPanel>
      <OpenDetailAction game={game} searchCallback={searchCallback} />
      {...getCommonGameActions(game, searchCallback)}
    </ActionPanel>
  );
}
