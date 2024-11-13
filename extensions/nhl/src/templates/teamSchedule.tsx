import React from "react";
import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { getNHL } from "../utils/nhlData";
import { Schedule, Game } from "../utils/types";
import Unresponsive from "./unresponsive";
import { getLanguageKey, teamLogo } from "../utils/helpers";
import GameActions from "./gameActions";
import { gameActions } from "../utils/translations";
import GameDetail from "./gameDetail";

const lang = getLanguageKey();

type ScheduleResponse = {
  data: Schedule;
  isLoading: boolean;
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

	if(!game) { return { source: "" } }

	let logo = teamLogo(game.homeTeam.abbrev);
  if (game.homeTeam.abbrev === homeTeam) {
    logo = teamLogo(game.awayTeam.abbrev);
  }

	return { source: logo };
};

const gridTitle = (day: string | undefined, game: Game | undefined, homeTeam: string): string => {
  if (!game || !day) return (day?.split('-').slice(2).join("")) ?? "";

  const date = day.split("-").slice(2).join(""); // Join the array elements

  let gameResult = "";
  let title = "";

  if (game.homeTeam.abbrev === homeTeam) {
    title = `${date} vs ${game.awayTeam.abbrev}`;
  } else {
    title = `${date} @ ${game.homeTeam.abbrev}`;
  }

  if (game.homeTeam.score && game.awayTeam.score) {
    gameResult = game.homeTeam.score > game.awayTeam.score ? "W" : "L";
    title += ` (${gameResult})`;
  }
  return title;
};

const gridSubtitle = (game: Game, homeTeam: string): string => {
}

export default function TeamSchedule({ team }: { team: string }) {
  const schedule = getNHL(`club-schedule/${team}/month/2024-11`) as ScheduleResponse;

  if (schedule.isLoading) return <Grid isLoading={true} />;
  if (!schedule.data) return <Unresponsive />;

  const calendarDays = createCalendarDays(2024, 11, schedule.data.games);

  return (
    <Grid columns={7} navigationTitle={`Schedule for ${team}`}>
      <Grid.Section title={`November 2024`}>
        {calendarDays.map((day, index) => (
          <Grid.Item
            key={index}
            content={gridContent(day.game, team)}
            title={gridTitle(day.date, day.game, team)}
            subtitle={day.game ? `vs ${day.game.awayTeam.commonName}` : ""}
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
    </Grid>
  );
}
