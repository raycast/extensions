import { Action, Icon, Keyboard } from "@raycast/api";
import { GameSummary } from "../../models";
import { DISPLAY_VALUES } from "../../constants";
import { OpenUrlAction } from "./OpenUrlAction";
import { SearchCallback } from "../..";
import { SeeTrendingAction } from "./SeeTrendingAction";
import { useRecents } from "../../hooks/UseRecents";

/**
 * A React component that renders an Action to launch the game if a playUrl is available.
 *
 * @param game The game to launch.
 * @returns A JSX.Element representing the PlayGameAction component, or an empty fragment if no playUrl is provided.
 */
function PlayGameAction({ game }: { game: GameSummary }) {
  const [, , addGame] = useRecents();
  if (!game.playUrl) {
    return <></>;
  }
  return (
    <OpenUrlAction
      icon={Icon.GameController}
      onAction={() => addGame(game)}
      title={DISPLAY_VALUES.launchGame}
      url={game.playUrl}
    />
  );
}

/**
 * A React component that renders an Action to copy the game's raw URL to the clipboard.
 *
 * @param url The game's raw URL to copy.
 * @returns A JSX.Element representing the CopyUrlAction component.
 */
function CopyUrlAction({ url }: { url: string }) {
  return (
    <Action.CopyToClipboard title={DISPLAY_VALUES.copyTitle} shortcut={Keyboard.Shortcut.Common.Copy} content={url} />
  );
}

/**
 * Generates an array of common game actions for a given game summary, including:
 * - Open the game's URL in the browser
 * - Launch the game (if a playUrl is available)
 * - Copy the game's raw URL to the clipboard
 *
 * @param game The GameSummary instance to generate the actions for.
 * @returns An array of JSX.Element representing the common game actions.
 */
export function getCommonGameActions(game: GameSummary, searchCallback: SearchCallback): JSX.Element[] {
  return [
    <PlayGameAction game={game} />,
    <CopyUrlAction url={game.rawUrl} />,
    <SeeTrendingAction searchCallback={searchCallback} />,
  ];
}
