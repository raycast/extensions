import { useCachedPromise } from "@raycast/utils";
import getScores from "../utils/getScores";
import type { Day, Game, Competitor } from "../types/schedule.types";

const fetchScores = async (league: string) => {
  const scoresData = await getScores({ league });

  const groupedScores: { [date: string]: Game[] } = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scoresData.forEach((game: any) => {
    const gameDate = new Date(game.date).toLocaleDateString(undefined, { dateStyle: "medium" });

    if (!groupedScores[gameDate]) {
      groupedScores[gameDate] = [];
    }

    groupedScores[gameDate].push({
      id: game.id,
      name: game.name,
      shortName: game.shortName,
      date: new Date(game.date).toLocaleTimeString(undefined, { timeStyle: "short" }),
      venue: game.competitions[0].venue,
      tickets: game.competitions[0].tickets,
      competitors: game.competitions[0].competitors
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (competitor: any): Competitor => ({
            id: competitor.id,
            displayName: competitor.team.displayName,
            abbreviation: competitor.team.abbreviation,
            shortName: competitor.team.shortDisplayName,
            logo: competitor.team.logo,
            color: competitor.team.color,
            alternateColor: competitor.team.alternateColor,
            home: competitor.homeAway,
            score: competitor.score,
            linescores: competitor.linescores,
            records: competitor.records ?? [],
          }),
        )
        .sort((a: Competitor) => (a.home === "home" ? -1 : 1)),
      status: {
        period: game.competitions[0].status.period,
        clock: game.competitions[0].status.displayClock,
        completed: game.competitions[0].status.type.completed,
        inProgress: game.competitions[0].status.type.description === "In Progress",
      },
      stream: game.links[0]?.href || null,
    });
  });

  const processedScores: Array<Day> = Object.keys(groupedScores).map((date) => ({
    date,
    games: groupedScores[date],
  }));

  processedScores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return processedScores;
};

const useScores = (league: string) =>
  useCachedPromise(fetchScores, [league], { failureToastOptions: { title: "Could not fetch scores" } });

export default useScores;
