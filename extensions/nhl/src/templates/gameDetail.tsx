import React from "react";
import { Detail } from "@raycast/api";
import { Game, GamecenterRightRailResponse} from "../utils/types";
import { getLanguageKey, timeRemaining, teamName, generateLineScoreTable, generateShotsTable, formatLocalTime, gameSummaryStats, scoresList, penaltiesList } from "../utils/helpers";
import { getNHL } from "../utils/nhlData";
import { gameStrings, timeStrings } from "../utils/translations";
import Unresponsive from "./unresponsive";

const languageKey = getLanguageKey();

interface gameLanding {
  data: Game;
  isLoading: boolean;
}

interface gameSidebar {
  data: GamecenterRightRailResponse;
  isLoading: boolean;
}

// const pastGame = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
//   const game = gameLanding.data;
//   const support = gameSidebar.data;
//   return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
//   \n ## ${gameStrings.linescore[languageKey]} \n ${generateLineScoreTable(support.linescore, game.awayTeam, game.homeTeam)} 
//   \n ## ${gameStrings.sog[languageKey]} \n ${generateShotsTable(support.shotsByPeriod, game.awayTeam, game.homeTeam)} `;
// }

const gameDetails = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;

  const gameTime = game.gameState === 'OFF'
    ? `${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}`
    : `${timeRemaining(game.clock, game.periodDescriptor)} - ${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}`;

  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
  \n ${gameTime}
  \n ${scoresList(game)}
  \n ---
  \n ${penaltiesList(game)}
  \n ${gameSummaryStats(support, game.awayTeam, game.homeTeam)}
  \n ## ${gameStrings.linescore[languageKey]} \n ${generateLineScoreTable(support.linescore, game.awayTeam, game.homeTeam)} 
  \n ## ${gameStrings.sog[languageKey]} \n ${generateShotsTable(support.shotsByPeriod, game.awayTeam, game.homeTeam)} `;
}

export default function GameDetail({ game }: { game: Game }) {
  const gameLanding = getNHL(`gamecenter/${game.id}/landing`) as gameLanding;
  const gameSidebar = getNHL(`gamecenter/${game.id}/right-rail`) as gameSidebar;

  if (gameLanding.isLoading || gameSidebar.isLoading) {
    return <Detail isLoading={true} />;
  }
 
  if (!gameLanding?.data || !gameSidebar?.data) {
    return <Unresponsive />;
  }

  switch(game.gameState) {
    case 'LIVE':
    case 'CRIT':
      return (
        <Detail
          markdown={gameDetails(gameLanding, gameSidebar)}
        />
      );
    case 'FUT':
    case 'PRE':
      return (
        <Detail
          markdown={`Future game`}
        />
      );
    default:
      return (
        <Detail
          markdown={gameDetails(gameLanding, gameSidebar)}
        />
      );
    }
}
