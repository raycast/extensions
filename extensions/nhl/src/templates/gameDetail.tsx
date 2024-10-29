import React from "react";
import { Detail } from "@raycast/api";
import { Game, GamecenterRightRailResponse} from "../utils/types";
import { getLanguageKey, timeRemaining, teamName, generateLineScoreTable, generateShotsTable, formatLocalTime, getOrdinalPeriod } from "../utils/helpers";
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

const scoresList = function(game: Game) {
  const scoring = game.summary?.scoring;
  if (!scoring) return '';
  let scores = '## Scoring \n';
  for (const period of scoring) {
    scores += `### ${getOrdinalPeriod(period.periodDescriptor.number)} \n`;
    if (period.goals.length === 0) {
      scores += 'No goals scored this period. \n\n';
    } else {
      for (const goal of period.goals) {
        scores += ` - <img src="https://assets.nhle.com/logos/nhl/svg/${goal.teamAbbrev.default}_light.svg" width="20" height="20" /> | **[${goal.homeScore} - ${goal.awayScore}](${goal.highlightClipSharingUrl})** | ${goal.timeInPeriod} | ${goal.shotType} | <img src="${goal.headshot}" alt="" width="20" height="20" /> ${goal.firstName.default} ${goal.lastName.default} (${goal.goalsToDate}) ${goal.strength === 'pp' ? 'PPG' : '' } | `;
        for (const [index, assist] of goal.assists.entries()) {
          scores += `A: ${assist.name.default} (${assist.assistsToDate})${index < goal.assists.length - 1 ? ', ' : ''}`;
        }
        scores += `\n`;
      }
    }
  }
  return scores;
}

const pastGame = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;
  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
  \n ## ${gameStrings.linescore[languageKey]} \n ${generateLineScoreTable(support.linescore, game.awayTeam, game.homeTeam)} 
  \n ## ${gameStrings.shotsOnGoal[languageKey]} \n ${generateShotsTable(support.shotsByPeriod, game.awayTeam, game.homeTeam)} `;
}

const liveGame = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;
  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
  \n ${timeRemaining(game.clock, game.periodDescriptor)} - ${formatLocalTime(game.startTimeUTC)} ${timeStrings.gameStart[languageKey]}
  \n ${scoresList(game)}
  \n ## ${gameStrings.linescore[languageKey]} \n ${generateLineScoreTable(support.linescore, game.awayTeam, game.homeTeam)} 
  \n ## ${gameStrings.shotsOnGoal[languageKey]} \n ${generateShotsTable(support.shotsByPeriod, game.awayTeam, game.homeTeam)} `;
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
          markdown={liveGame(gameLanding, gameSidebar)}
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
          markdown={pastGame(gameLanding, gameSidebar)}
        />
      );
    }
}
