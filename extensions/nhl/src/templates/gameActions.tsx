import { Action, Icon } from "@raycast/api";

import { Game } from "../utils/types";
import { gameActions } from "../utils/translations";
import { getLanguageKey } from "../utils/helpers";

const language = getLanguageKey();

export default function GameActions({ game }: { game: Game }) {
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

export function PlayerAction({ slug, name }: { slug: string; name: string }) {
  return (
    <Action.OpenInBrowser
      icon={Icon.Person}
      title={`${gameActions.view[language]} ${name} ${gameActions.onGameCenter[language]}`}
      url={`https://www.nhl.com/player/${slug}`}
    />
  );
}
