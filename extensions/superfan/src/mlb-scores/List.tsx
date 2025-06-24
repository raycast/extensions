import { List } from "@raycast/api";
import MLBScoresDetail from "./ListDetail";
import useMLBScores from "../hooks/useMLBScores";
import FinishedGame from "../mlb-scores/FinishedGame";
import { fetchAllLogos } from "../hooks/useMLBScores";
import { useEffect } from "react";

export default function ScoresList() {
  const { gameData } = useMLBScores();
  const regex = /(\d{1,2}:\d{2}\s(?:AM|PM)\s[A-Z]{3})/;

  useEffect(() => {
    fetchAllLogos();
  }, []);

  return (
    <List navigationTitle="MLB Scores" filtering={true} searchBarPlaceholder="Filter by team name..." isShowingDetail>
      <List.Section title="Ongoing Games">
        {gameData
          .filter((games) => games.status.state === "in")
          .map((game) => {
            return (
              <List.Item
                key={game.id}
                title={`${game.homeTeam.name} ${game.homeTeam.stats.runs}, ${game.awayTeam.name} ${game.awayTeam.stats.runs}`}
                accessories={[{ text: game.status.inning, tooltip: "Inning" }]}
                detail={<MLBScoresDetail home={game.homeTeam} away={game.awayTeam} liveAtBat={game.situation} />}
              />
            );
          })}
      </List.Section>
      <List.Section title="Finished Games">
        {gameData
          .filter((games) => games.status.state === "post")
          .map((game) => {
            return (
              <List.Item
                key={game.id}
                title={`${game.homeTeam.name} ${game.homeTeam.stats.runs}, ${game.awayTeam.name} ${game.awayTeam.stats.runs}`}
                accessories={[{ text: game.status.inning, tooltip: "Inning" }]}
                detail={<FinishedGame home={game.homeTeam} away={game.awayTeam} link={game.link} />}
              />
            );
          })}
      </List.Section>
      <List.Section title="Upcoming Games">
        {gameData
          .filter((games) => games.status.state === "pre")
          .map((game) => {
            const match = game.status.inning.match(regex);
            const startTime = match ? match[1] : null;
            return (
              <List.Item
                key={game.id}
                title={`${game.homeTeam.name}, ${game.awayTeam.name}`}
                accessories={[{ text: startTime, tooltip: "Start Time" }]}
                detail={<MLBScoresDetail home={game.homeTeam} away={game.awayTeam} liveAtBat={game.situation} />}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
