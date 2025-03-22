import React from "react";
import { ActionPanel, Action, Grid } from "@raycast/api";
import { getNHL } from "../utils/nhlData";
import { Schedule, Game } from "../utils/types";
import Unresponsive from "./unresponsive";
import { getLanguageKey, teamLogo, formatLocalTime } from "../utils/helpers";
import GameActions from "./gameActions";
import { gameActions, userInterface } from "../utils/translations";
import GameDetail from "./gameDetail";

const lang = getLanguageKey();

type ScheduleResponse = {
  data: Schedule;
  isLoading: boolean;
};

type SeasonMonth = {
  month: number;
  year: number;
};

const getSeasonMonths = (): SeasonMonth[] => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Define the full season (Oct 2024 - Apr 2025)
  const seasonMonths: SeasonMonth[] = [
    { month: 10, year: 2024 }, // Oct 2024
    { month: 11, year: 2024 }, // Nov 2024
    { month: 12, year: 2024 }, // Dec 2024
    { month: 1, year: 2025 }, // Jan 2025
    { month: 2, year: 2025 }, // Feb 2025
    { month: 3, year: 2025 }, // Mar 2025
    { month: 4, year: 2025 }, // Apr 2025
    { month: 5, year: 2025 }, // May 2025
  ];

  // Find the current month's index in the season
  const currentMonthIndex = seasonMonths.findIndex((m) => m.month === currentMonth && m.year === currentYear);

  if (currentMonthIndex === -1) {
    // If current month is not in season, return regular order
    return seasonMonths;
  }

  // Reorder months to start with current month
  const futureMonths = seasonMonths.slice(currentMonthIndex);
  const pastMonths = seasonMonths.slice(0, currentMonthIndex);

  return [...futureMonths, ...pastMonths];
};

const getMonthName = (month: number) => {
  const date = new Date(2024, month - 1, 1);
  return date.toLocaleString(lang, { month: "long" });
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month - 1, 1).getDay();
};

const createCalendarDays = (year: number, month: number, games: Schedule["games"]) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: Array<{
    date: string;
    hasGame: boolean;
    game?: Game; // Add game object to the type
  }> = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDay; i++) {
    days.push({ date: "", hasGame: false });
  }

  // Create a map of games by date for quick lookup
  const gamesByDate = games.reduce(
    (acc, game) => {
      acc[game.gameDate] = game;
      return acc;
    },
    {} as Record<string, Game>,
  );

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const game = gamesByDate[dateString];

    days.push({
      date: dateString,
      hasGame: !!game,
      game: game,
    });
  }

  return days;
};

const gridContent = (game: Game | undefined, homeTeam: string) => {
  if (!game) {
    return { source: "" };
  }

  let logo = teamLogo(game.homeTeam.abbrev);
  if (game.homeTeam.abbrev === homeTeam) {
    logo = teamLogo(game.awayTeam.abbrev);
  }

  return { source: logo };
};

interface GameResult {
  isHomeTeam: boolean;
  opponent: string;
  date: string;
  result?: string;
}

const determineGameResult = (game: Game, isHomeTeam: boolean): string | undefined => {
  if (!game.homeTeam.score || !game.awayTeam.score) return undefined;

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;

  // Handle overtime/shootout games
  const isOvertimeGame = game.periodDescriptor?.periodType === "OT" || game.periodDescriptor?.periodType === "SO";

  if (isHomeTeam) {
    if (homeScore > awayScore) return "W";
    if (homeScore < awayScore) return "L";
    if (isOvertimeGame) return homeScore > awayScore ? "W" : "L";
  } else {
    if (awayScore > homeScore) return "W";
    if (awayScore < homeScore) return "L";
    if (isOvertimeGame) return awayScore > homeScore ? "W" : "L";
  }

  return undefined;
};

const gridTitle = (day: string | undefined, game: Game | undefined, homeTeam: string): string => {
  if (!game || !day) return day?.split("-").slice(2).join("") ?? "";

  const gameDetails: GameResult = {
    isHomeTeam: game.homeTeam.abbrev === homeTeam,
    opponent: game.homeTeam.abbrev === homeTeam ? game.awayTeam.abbrev : game.homeTeam.abbrev,
    date: day.split("-").slice(2).join(""),
    result: determineGameResult(game, game.homeTeam.abbrev === homeTeam),
  };

  const prefix = gameDetails.isHomeTeam ? "vs" : "@";
  const baseTitle = `${gameDetails.date} ${prefix} ${gameDetails.opponent}`;

  return gameDetails.result ? `${baseTitle} (${gameDetails.result})` : baseTitle;
};

const gridSubtitle = (game: Game | undefined): string => {
  if (!game) {
    return "";
  }

  if (!game.awayTeam.score) {
    return formatLocalTime(game.startTimeUTC).split(",")[1];
  }

  return game?.awayTeam.score ? `${game.homeTeam.score ?? ""}-${game.awayTeam.score ?? ""}` : `${game?.startTimeUTC}`;
};

export default function TeamSchedule({ team }: { team: string }) {
  const seasonMonths = getSeasonMonths();

  // Create an object to store schedule data for each month
  const scheduleData = seasonMonths.map(({ month, year }) => {
    const monthStr = month.toString().padStart(2, "0");
    const schedule = getNHL(`club-schedule/${team}/month/${year}-${monthStr}`) as ScheduleResponse;
    return {
      month,
      year,
      schedule,
    };
  });

  // Check if any schedule is still loading
  const isLoading = scheduleData.some((data) => data.schedule.isLoading);
  if (isLoading) return <Grid isLoading={true} />;

  // Check if any schedule failed to load
  const hasError = scheduleData.some((data) => !data.schedule.data);
  if (hasError) return <Unresponsive />;

  return (
    <Grid columns={7} searchBarPlaceholder={`${userInterface.searchSchedule[lang]} ${team}`}>
      {scheduleData.map(({ month, year, schedule }) => {
        const calendarDays = createCalendarDays(year, month, schedule.data.games);

        return (
          <Grid.Section key={`${year}-${month}`} title={`${getMonthName(month)} ${year}`}>
            {calendarDays.map((day, index) => (
              <Grid.Item
                key={index}
                content={gridContent(day.game, team)}
                title={gridTitle(day.date, day.game, team)}
                subtitle={gridSubtitle(day.game)}
                actions={
                  day.game && (
                    <ActionPanel>
                      <Action.Push title={gameActions.showGame[lang]} target={<GameDetail game={day.game} />} />
                      <GameActions game={day.game} />
                    </ActionPanel>
                  )
                }
              />
            ))}
          </Grid.Section>
        );
      })}
    </Grid>
  );
}
