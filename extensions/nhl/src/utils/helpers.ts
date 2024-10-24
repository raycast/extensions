import { ScoreboardResponse, Game, SortedGames, Timezone } from "./types";
import { getPreferenceValues, Color } from "@raycast/api";

const preferences = getPreferenceValues();
const timezone = preferences.timezone as Timezone;

export function sortGames(apiResponse: ScoreboardResponse): SortedGames {
  // Create a date object in the user's timezone
  const now = new Date();
  const userTimeZone = timezone.timezone;

  // Get the start of today in the user's timezone
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: userTimeZone }));
  todayStart.setHours(0, 0, 0, 0);

  // Get the end of today in the user's timezone
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const pastGames: Game[] = [];
  const todayGames: Game[] = [];
  const futureGames: Game[] = [];

  apiResponse.gamesByDate.forEach((dateEntry) => {
    dateEntry.games.forEach((game) => {
      const gameTime = new Date(game.startTimeUTC);

      // Convert game time to user's timezone
      const gameTimeInUserTZ = new Date(gameTime.toLocaleString("en-US", { timeZone: userTimeZone }));

      if (gameTimeInUserTZ >= todayStart && gameTimeInUserTZ <= todayEnd) {
        todayGames.push(game);
      } else if (gameTimeInUserTZ < todayStart) {
        pastGames.push(game);
      } else {
        futureGames.push(game);
      }
    });
  });

  return {
    pastGames,
    todayGames,
    futureGames,
  };
}

export function getOrdinalPeriod(num: number | undefined): string {
  if (num === undefined) return "";

  if (num < 1 || num > 9) return `Period ${num}`;

  const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  return `${ordinals[num - 1]} Period`;
}

export function formatLocalTime(time: string): string {
  const preferences = getPreferenceValues<Timezone>();
  const userTimezone = preferences.timezone;

  const fullUTCString = time.includes("T") ? time : `${time}T00:00:00Z`;

  const utcDate = new Date(fullUTCString);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday(utcDate)) {
    return timeFormatter.format(utcDate);
  } else {
    const formattedDateTime = dateTimeFormatter.format(utcDate);
    // Convert MM/DD/YYYY to YYYY-MM-DD
    return formattedDateTime;
  }
}

export function getScoreColor(game: Game, team: "Home" | "Away"): Color.Green | undefined {
  if (typeof game.homeTeam.score !== "number" || typeof game.awayTeam.score !== "number") {
    return undefined;
  }

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;

  if (team === "Home" && homeScore > awayScore) return Color.Green;
  if (team === "Away" && awayScore > homeScore) return Color.Green;

  return undefined;
}

export function getLanguageKey() {
  const language = preferences.language as "default" | "fr";
  const languageKey = language === "fr" ? "fr" : "default";
  return languageKey;
}
