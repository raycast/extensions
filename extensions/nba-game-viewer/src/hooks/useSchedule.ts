import getSchedule from "../utils/getSchedule";
import { useState, useEffect } from "react";
import { Day, Game, Competitor } from "../types/schedule.types";
import convertDate from "../utils/convertDate";

const useSchedule = (): {
  schedule: Day[];
  loading: boolean;
  error: boolean;
} => {
  const [schedule, setSchedule] = useState<Array<Day>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const getGames = async () => {
      const currentDate = new Date();

      let data: any = null;

      try {
        data = await getSchedule({
          year: currentDate.getUTCFullYear(),
          month: currentDate.getUTCMonth() + 1,
          day: currentDate.getUTCDate(),
        });
      } catch (error) {
        setError(true);
        return error;
      }

      Object.keys(data).map((key) => {
        if (!Object.prototype.hasOwnProperty.call(data[key], "games")) {
          delete data[key];
        }
      });

      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const scheduledGames: Array<Day> = Object.keys(data).map((key) => {
        return {
          date: `${
            weekdays[new Date(data[key].games[0].date.toLocaleString("en-US")).getUTCDay() - 1]
          }  —  ${convertDate(key)}`,
          games: data[key].games.map((game: any): Game => {
            return {
              id: game.id,
              name: game.name,
              shortName: game.shortName,
              time: new Date(game.date).toLocaleTimeString("en-US", { timeStyle: "short" }).toString(),
              competitors: game.competitions[0].competitors
                .map((competitor: any): Competitor => {
                  return {
                    displayName: competitor.team.displayName,
                    shortName: competitor.team.shortDisplayName,
                    logo: competitor.team.logo,
                    home: competitor.homeAway,
                  };
                })
                .sort((a: Competitor) => {
                  return a.home === "home" ? -1 : 1;
                }),
              status: {
                period: game.competitions[0].status.period,
                clock: game.competitions[0].status.clock,
                completed: game.competitions[0].status.type.completed,
                inProgress: game.competitions[0].status.type.description === "In Progress",
              },
              stream: game.links[0].href,
            };
          }),
        };
      });

      setSchedule(scheduledGames);
      setLoading(false);
    };

    getGames();
  }, []);

  return { schedule, loading, error };
};

export default useSchedule;
