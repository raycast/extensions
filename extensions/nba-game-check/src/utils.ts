import { Color, Icon, Image } from "@raycast/api";
import { Game } from "./api";

/**
 * Determine if a team won a given game.
 */
export function didTeamWin(game: Game, teamId: number): boolean {
  const isHome = game.home_team.id === teamId;
  if (isHome) {
    return game.home_team_score > game.visitor_team_score;
  }
  return game.visitor_team_score > game.home_team_score;
}

/**
 * Format a game score like "108 - 102"
 */
export function formatScore(game: Game): string {
  return `${game.visitor_team_score} - ${game.home_team_score}`;
}

/**
 * Format a game matchup like "NYK @ BOS" or "BOS vs NYK" depending on perspective.
 */
export function formatMatchup(game: Game, teamId: number): string {
  const isHome = game.home_team.id === teamId;
  if (isHome) {
    return `vs ${game.visitor_team.abbreviation}`;
  }
  return `@ ${game.home_team.abbreviation}`;
}

/**
 * Full matchup string like "Knicks @ Celtics"
 */
export function formatFullMatchup(game: Game): string {
  return `${game.visitor_team.name} @ ${game.home_team.name}`;
}

/**
 * Format game date in a readable way, e.g. "Mon, Mar 17"
 */
export function formatGameDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // noon to avoid timezone drift
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a game datetime into local time, e.g. "7:30 PM"
 */
export function formatGameTime(datetimeStr: string): string {
  const date = new Date(datetimeStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Check if a game date is today.
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const gameDate = new Date(dateStr + "T12:00:00");
  return (
    today.getFullYear() === gameDate.getFullYear() &&
    today.getMonth() === gameDate.getMonth() &&
    today.getDate() === gameDate.getDate()
  );
}

/**
 * Get the right icon for a completed game result.
 */
export function getResultIcon(
  game: Game,
  teamId: number
): Image.ImageLike {
  const won = didTeamWin(game, teamId);
  return {
    source: won ? Icon.CheckCircle : Icon.XMarkCircle,
    tintColor: won ? Color.Green : Color.Red,
  };
}

/**
 * Format a score string with W/L prefix from the team's perspective.
 */
export function formatScoreWithResult(
  game: Game,
  teamId: number
): string {
  const won = didTeamWin(game, teamId);
  const prefix = won ? "W" : "L";

  const isHome = game.home_team.id === teamId;
  const teamScore = isHome
    ? game.home_team_score
    : game.visitor_team_score;
  const oppScore = isHome
    ? game.visitor_team_score
    : game.home_team_score;

  return `${prefix} ${teamScore}-${oppScore}`;
}

/**
 * Build an ESPN game URL (best-effort, uses team abbreviations).
 */
export function getESPNUrl(game: Game): string {
  // ESPN URL format for NBA games
  const dateStr = game.date.replace(/-/g, "");
  return `https://www.espn.com/nba/game?gameId=${dateStr}${game.id}`;
}

/**
 * Build an NBA.com schedule URL for the team.
 */
export function getNBAScheduleUrl(teamAbbr: string): string {
  return `https://www.nba.com/${teamAbbr.toLowerCase()}/schedule`;
}

/**
 * Get a subtitle string for the game status.
 */
export function getGameStatusText(game: Game): string {
  if (game.status === "Final") {
    return "Final";
  }
  // Live game statuses come through as "1st Qtr", "2nd Qtr", "Halftime", etc.
  if (
    game.status.includes("Qtr") ||
    game.status === "Halftime" ||
    game.status.includes("OT")
  ) {
    return `LIVE — ${game.status}`;
  }
  // Future games have ISO datetime as status
  return formatGameTime(game.datetime);
}
