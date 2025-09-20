import { List } from "@raycast/api";
import { getNHL } from "./utils/nhlData";
import { ScoreboardResponse } from "./utils/types";
import { sortGames } from "./utils/helpers";
import { gameTitles } from "./utils/translations";
import { getLanguageKey } from "./utils/helpers";

import Unresponsive from "./templates/unresponsive";
import GameList from "./templates/gameList";

const languageKey = getLanguageKey();

interface today {
  data: ScoreboardResponse;
  isLoading: boolean;
}

export default function Command() {
  const scoreboard = getNHL("scoreboard/now") as today;

  if (!scoreboard?.data && scoreboard.isLoading === false) return <Unresponsive />;

  const games = sortGames(scoreboard.data);

  return (
    <List isLoading={scoreboard.isLoading}>
      <GameList title={gameTitles.favorite[languageKey]} games={games.todayGames} favTeam={true} />
      <GameList title={gameTitles.today[languageKey]} games={games.todayGames} favTeam={false} />
      <GameList title={gameTitles.past[languageKey]} games={games.pastGames} favTeam={false} />
      <GameList title={gameTitles.future[languageKey]} games={games.futureGames} favTeam={false} />
    </List>
  );
}
