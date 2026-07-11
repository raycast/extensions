import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { List, Action, ActionPanel } from "@raycast/api";
import { Game } from "../utils/types";
import { getOrdinalPeriod, formatLocalTime, getScoreColor, teamLogo } from "../utils/helpers";
import { gameActions } from "../utils/translations";
import { getLanguageKey } from "../utils/helpers";
import { gameStates, timeStrings } from "../utils/translations";
import GameDetail from "./gameDetail";
import GameActions from "./gameActions";

// const preferences = getPreferenceValues();
//const language = preferences.language as "default" | "fr";
const language = "default";
const languageKey = getLanguageKey();

function gameAccessories(game: Game) {
  switch (game.gameState) {
    case "OFF":
      return gameStates.final[languageKey];
    case "FUT":
      return "";
    case "CRIT":
      if (game.otInUse) {
        return `${gameStates.crit[languageKey]}: ${getOrdinalPeriod(game.periodDescriptor?.number)}`;
      } else {
        return `${getOrdinalPeriod(game.periodDescriptor?.number)}`;
      }
    case "LIVE":
      return `${getOrdinalPeriod(game.periodDescriptor?.number)}`;
    case "PRE":
      return `${gameStates.preGame[languageKey]}`;
    default:
      return gameStates.final[languageKey];
  }
}

const gameTime = function (game: Game) {
  if (game.clock?.timeRemaining) {
    return `${game.clock?.timeRemaining} ${timeStrings.timeRemainingShort[languageKey]}`;
  } else if (game.clock?.inIntermission) {
    return `${timeStrings.intermission[languageKey]}: ${game.clock?.timeRemaining}`;
  } else if (game.gameState === "OFF") {
    return formatLocalTime(game.startTimeUTC);
  } else {
    return `${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}`;
  }
};

export default function GameList({
  title,
  games,
  favTeam = false,
}: {
  title: string;
  games: Game[];
  favTeam?: boolean;
}) {
  const favoriteTeam = getPreferenceValues().team as string;

  const filteredGames = favTeam
    ? games.filter((game) => game.homeTeam.abbrev === favoriteTeam || game.awayTeam.abbrev === favoriteTeam)
    : games;

  return (
    <List.Section title={title}>
      {filteredGames.length > 0
        ? filteredGames.map((game) => (
            <List.Item
              key={game.id}
              title={`${game.awayTeam.name[languageKey]} @ ${game.homeTeam.name[languageKey]}`}
              subtitle={gameAccessories(game)}
              accessories={[
                { text: gameTime(game) },
                {
                  tag: { value: String(game.awayTeam.score ?? ""), color: getScoreColor(game, "Away") },
                  icon: teamLogo(game.awayTeam.abbrev),
                },
                { text: "vs" },
                {
                  tag: { value: String(game.homeTeam.score ?? ""), color: getScoreColor(game, "Home") },
                  icon: teamLogo(game.homeTeam.abbrev),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title={gameActions.showGame[language]} target={<GameDetail game={game} />} />
                  <GameActions game={game} />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List.Section>
  );
}
