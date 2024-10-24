import { Detail } from "@raycast/api";
import { Game } from "../utils/types";
import { getLanguageKey } from "../utils/helpers";
import { getNHL } from "../utils/nhlData";
import Unresponsive from "./unresponsive";

const languageKey = getLanguageKey();

interface gameLanding {
  data: Game;
  isLoading: boolean;
}

interface gameSidebar {
  data: Game;
  isLoading: boolean;
}

const liveGame = function(gameLanding: Game, gameSidebar: Game) {
  return `# Game ${gameLanding.id} \n`
}

export default function GameDetail({ game }: { game: Game }) {
  const gameLanding = getNHL(`gamecenter/${game.id}/landing`) as gameLanding;
  const gameSidebar = getNHL(`gamecenter/${game.id}/right-rail`) as gameSidebar;

  if (gameLanding.isLoading && !gameLanding?.data || 
    gameSidebar.isLoading && !gameSidebar?.data) {
    return <Detail isLoading={true} />;
  }
 
  if (!gameLanding?.data || !gameSidebar?.data) {
    return <Unresponsive />;
  }

  const defaultGame = `default \n # Game ${game.id} \n
  ${gameLanding.data.clock?.timeRemaining} \n`;

  switch(game.gameState) {
    case 'LIVE':
      return (
        <Detail
          markdown={liveGame(gameLanding, gameSidebar)}
        />
      );
    default:
      return (
        <Detail
          markdown={defaultGame}
        />
      );
    }
}
