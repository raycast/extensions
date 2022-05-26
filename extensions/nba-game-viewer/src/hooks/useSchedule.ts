import getSchedule from "../utils/getSchedule";
import { useState, useEffect } from "react";
import { Day, Game, Competitor } from "../schedule.types";
import { Toast, showToast } from "@raycast/api";
import convertDate from "../utils/convertDate";

const useSchedule = () => {
  const [schedule, setSchedule] = useState<Array<Day>>([]);

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
      } catch (e) {
        showToast(Toast.Style.Failure, "Failed to get schedule");
      }

      Object.keys(data).map((key) => {
        if (!data[key].hasOwnProperty("games")) {
          delete data[key];
        }
      });

      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const scheduledGames: Array<Day> = Object.keys(data).map((key) => {
        return {
          date: `${weekdays[new Date(data[key].games[0].date.toLocaleString("en-US")).getUTCDay()]}  —  ${convertDate(
            key
          )}`,
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
                .sort((a: Competitor, b: Competitor) => {
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
    };

    getGames();
  }, []);

  return schedule;
};

export default useSchedule;
