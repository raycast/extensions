import React from "react";
import { ActionPanel, Detail } from "@raycast/api";
import { Game, GamecenterRightRailResponse } from "../utils/types";
import {
  getLanguageKey,
  timeRemaining,
  teamName,
  generateLineScoreTable,
  generateShotsTable,
  formatLocalTime,
  summaryStats,
  scoresList,
  penaltiesList,
  starsOfTheGame,
  last10Record,
} from "../utils/helpers";
import { getNHL } from "../utils/nhlData";
import { gameStrings, timeStrings } from "../utils/translations";
import Unresponsive from "./unresponsive";
import GameActions, { PlayerAction } from "./gameActions";

const languageKey = getLanguageKey();

interface gameLanding {
  data: Game;
  isLoading: boolean;
}

interface gameSidebar {
  data: GamecenterRightRailResponse;
  isLoading: boolean;
}

const gameDetails = function (gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;

  const gameTime =
    game.gameState === "OFF"
      ? `${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}`
      : `${timeRemaining(game.clock, game.periodDescriptor)} - ${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}`;

  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
  \n ${gameTime}
  \n ${scoresList(game)}
  \n ---
  \n ${penaltiesList(game)}
  \n ## ${gameStrings.gameStats[languageKey]}
  \n ${summaryStats(support, game.awayTeam, game.homeTeam, "live")}
  \n ${starsOfTheGame(game)}
  \n ## ${gameStrings.linescore[languageKey]} \n ${generateLineScoreTable(support.linescore, game.awayTeam, game.homeTeam)} 
  \n ## ${gameStrings.sog[languageKey]} \n ${generateShotsTable(support.shotsByPeriod, game.awayTeam, game.homeTeam)} `;
};

const preGameDetails = function (gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;

  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} (${game.awayTeam.record}) @ ${teamName(game.homeTeam, game.homeTeam.score, true)} (${game.homeTeam.record})
  \n ${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}, ${game.gameDate}
  \n ${last10Record(support, game.awayTeam, game.homeTeam)}
  \n ## ${gameStrings.seasonStats[languageKey]}
  \n ${summaryStats(support, game.awayTeam, game.homeTeam, "pre")}`;
};

export default function GameDetail({ game }: { game: Game }) {
  const gameLanding = getNHL(`gamecenter/${game.id}/landing`) as gameLanding;
  const gameSidebar = getNHL(`gamecenter/${game.id}/right-rail`) as gameSidebar;

  if (gameLanding.isLoading || gameSidebar.isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!gameLanding?.data || !gameSidebar?.data) {
    return <Unresponsive />;
  }

  switch (game.gameState) {
    case "FUT":
    case "PRE":
      return (
        <Detail
          markdown={preGameDetails(gameLanding, gameSidebar)}
          actions={
            <ActionPanel>
              <GameActions game={game} />
            </ActionPanel>
          }
        />
      );
    case "LIVE":
    case "CRIT":
    default:
      return (
        <Detail
          markdown={gameDetails(gameLanding, gameSidebar)}
          actions={
            <ActionPanel>
              <GameActions game={game} />
              {gameLanding.data?.summary?.threeStars &&
                gameLanding.data.summary?.threeStars.map((star, index) => (
                  <PlayerAction
                    name={typeof star.name === "string" ? star.name : (star.name?.default ?? "")}
                    slug={star.playerId as string}
                    key={index}
                  />
                ))}
            </ActionPanel>
          }
        />
      );
  }
}
