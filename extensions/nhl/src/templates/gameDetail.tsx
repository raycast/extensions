import { Detail } from "@raycast/api";
import { Game, GamecenterRightRailResponse} from "../utils/types";
import { getLanguageKey, timeRemaining, teamName, generateLineScoreTable, generateShotsTable } from "../utils/helpers";
import { getNHL } from "../utils/nhlData";
import { gameStrings } from "../utils/translations";
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

const liveGame = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;
  return `# Game ${game.id} \n` + timeRemaining(game.clock, game.periodDescriptor);
}


const pastGame = function(gameLanding: gameLanding, gameSidebar: gameSidebar) {
  const game = gameLanding.data;
  const support = gameSidebar.data;
  return `# ${teamName(game.awayTeam, game.awayTeam.score, true)} @ ${teamName(game.homeTeam, game.homeTeam.score, true)} 
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
