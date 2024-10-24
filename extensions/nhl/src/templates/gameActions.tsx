import { Action, Icon } from "@raycast/api";

import { Game } from "../utils/types";
import { gameActions } from "../utils/translations";
import { getLanguageKey } from "../utils/helpers";

export default function GameActions({ game }: { game: Game }) {
  const language = getLanguageKey();
  let recapLink = "https://nhl.com" + game.threeMinRecap;
  if (language === "fr" && game.threeMinRecapFr) {
    recapLink = "https://nhl.com" + game.threeMinRecapFr;
  }
  return (
    <>
      <Action.OpenInBrowser
        title={gameActions.gameCenter[language]}
        url={`https://nhl.com${game.gameCenterLink}`}
        icon={Icon.GameController}
      />
      {game.gameState === "FUT" && (
        <Action.OpenInBrowser title={gameActions.findTickets[language]} url={game.ticketsLink} icon={Icon.Ticket} />
      )}
      {game.threeMinRecap && (
        <Action.OpenInBrowser title={gameActions.threeMinRecap[language]} url={recapLink} icon={Icon.Video} />
      )}
    </>
  );
}
