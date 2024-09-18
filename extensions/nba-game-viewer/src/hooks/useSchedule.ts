import { useCachedPromise } from "@raycast/utils";
import getSchedule from "../utils/getSchedule";
import type { Day, Game, Competitor } from "../types/schedule.types";
import convertDate from "../utils/convertDate";

const fetchSchedule = async (league: string) => {
  const currentDate = new Date();

  const scheduleData = await getSchedule({
    league: league,
    year: currentDate.getUTCFullYear(),
    month: currentDate.getUTCMonth() + 1,
    day: currentDate.getUTCDate(),
  });

  Object.keys(scheduleData).forEach((key) => {
    if (!scheduleData[key].games) {
      delete scheduleData[key];
    }
  });

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const scheduledGames: Array<Day> = Object.keys(scheduleData).map((key) => ({
    date: `${weekdays[new Date(scheduleData[key].games[0]?.date).getDay()]}  —  ${convertDate(key)}`,
    games: scheduleData[key].games.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (game: any): Game => ({
        id: game.id,
        name: game.name,
        shortName: game.shortName,
        date: new Date(game.date).toLocaleTimeString("en-US", { timeStyle: "short" }),
        competitors: game.competitions[0].competitors
          .map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (competitor: any): Competitor => ({
              displayName: competitor.team.displayName,
              abbreviation: competitor.team.abbreviation,
              shortName: competitor.team.shortDisplayName,
              logo: competitor.team.logo,
              home: competitor.homeAway,
              score: competitor.score,
            }),
          )
          .sort((a: Competitor) => (a.home === "home" ? -1 : 1)),
        status: {
          period: game.competitions[0].status.period,
          clock: game.competitions[0].status.clock,
          completed: game.competitions[0].status.type.completed,
          inProgress: game.competitions[0].status.type.description === "In Progress",
        },
        stream: game.links[0].href,
      }),
    ),
  }));

  return scheduledGames;
};

const useSchedule = (league: string) =>
  useCachedPromise(fetchSchedule, [league], { failureToastOptions: { title: "Could not fetch schedule" } });

export default useSchedule;
