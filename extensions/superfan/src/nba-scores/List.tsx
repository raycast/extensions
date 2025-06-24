import { List } from "@raycast/api";
import ListDetail from "./ListDetail";
import useNBAScores from "../hooks/useNBAScores";

export default function ScoresList() {
  const { gameData } = useNBAScores();

  return (
    <List navigationTitle="NBA Scores" filtering={true} searchBarPlaceholder="Filter by team name..." isShowingDetail>
      <List.Section title="Ongoing Games">
        {gameData
          .filter((games) => games.status.state == "in")
          .map((game) => {
            return (
              <List.Item
                title={`${game.homeTeam.abbreviation} ${game.homeTeam.stats.score}, ${game.awayTeam.abbreviation} ${game.awayTeam.stats.score}`}
                accessories={[{ text: game.status.description }]}
                detail={<ListDetail homeTeam={game.homeTeam} awayTeam={game.awayTeam} lastPlay={game.lastPlay} />}
              />
            );
          })}
      </List.Section>
      <List.Section title="Finished Games">
        {gameData
          .filter((games) => games.status.state == "post")
          .map((game) => {
            return (
              <List.Item
                title={`${game.homeTeam.abbreviation} ${game.homeTeam.stats.score}, ${game.awayTeam.abbreviation} ${game.awayTeam.stats.score}`}
                accessories={[{ text: game.status.description }]}
                detail={<ListDetail homeTeam={game.homeTeam} awayTeam={game.awayTeam} lastPlay={game.lastPlay} />}
              />
            );
          })}
      </List.Section>
      <List.Section title="Upcoming Games">
        {gameData
          .filter((games) => games.status.state == "pre")
          .map((game) => {
            return (
              <List.Item
                title={`${game.homeTeam.abbreviation} ${game.homeTeam.stats.score}, ${game.awayTeam.abbreviation} ${game.awayTeam.stats.score}`}
                accessories={[{ text: game.status.description }]}
                detail={<ListDetail homeTeam={game.homeTeam} awayTeam={game.awayTeam} lastPlay={game.lastPlay} />}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
