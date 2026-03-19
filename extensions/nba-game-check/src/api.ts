import { getPreferenceValues } from "@raycast/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Preferences {
  apiKey: string;
}

export interface APITeam {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

export interface Game {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string;
  postseason: boolean;
  home_team_score: number;
  visitor_team_score: number;
  datetime: string;
  home_team: APITeam;
  visitor_team: APITeam;
}

interface GamesResponse {
  data: Game[];
  meta: {
    next_cursor?: number;
    per_page: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.balldontlie.io/nba/v1";

function getHeaders(): HeadersInit {
  const { apiKey } = getPreferenceValues<Preferences>();
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generate an array of date strings from `start` to `end` (inclusive).
 */
function dateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function fetchGames(
  teamId: number,
  dates: string[]
): Promise<Game[]> {
  // BallDontLie accepts multiple dates[] params
  const params = new URLSearchParams();
  params.append("team_ids[]", String(teamId));
  for (const d of dates) {
    params.append("dates[]", d);
  }
  params.append("per_page", "100");

  const response = await fetch(`${BASE_URL}/games?${params.toString()}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `BallDontLie API error (${response.status}): ${text}`
    );
  }

  const json = (await response.json()) as GamesResponse;
  return json.data;
}

// ─── Public interface ────────────────────────────────────────────────────────

export interface TeamGamesData {
  recentGames: Game[]; // last 3 completed games, newest first
  upcomingGames: Game[]; // next 3 scheduled games, soonest first
  todayGame: Game | null; // game today (if any)
}

/**
 * Fetch the last 3 completed games and next 3 upcoming games for a team.
 * Also flags whether there is a game today.
 */
export async function fetchTeamGames(
  teamId: number
): Promise<TeamGamesData> {
  const today = new Date();

  // Look back 30 days for recent games (covers All-Star break gaps)
  const past = new Date(today);
  past.setDate(past.getDate() - 30);

  // Look ahead 14 days for upcoming games
  const future = new Date(today);
  future.setDate(future.getDate() + 14);

  // Fetch both ranges in parallel
  const [pastGames, futureGames] = await Promise.all([
    fetchGames(teamId, dateRange(past, today)),
    fetchGames(teamId, dateRange(today, future)),
  ]);

  // Split into completed and scheduled
  const completed = pastGames
    .filter((g) => g.status === "Final")
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  const todayStr = formatDate(today);

  const scheduled = futureGames
    .filter((g) => g.status !== "Final" && g.date >= todayStr)
    .sort(
      (a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

  // Check for live games (status like "1st Qtr", "Halftime", etc.)
  const liveOrToday =
    futureGames.find(
      (g) =>
        g.date === todayStr &&
        g.status !== "Final" &&
        !g.status.includes("T") // not a future timestamp
    ) ||
    pastGames.find((g) => g.date === todayStr && g.status === "Final") ||
    scheduled.find((g) => g.date === todayStr) ||
    null;

  return {
    recentGames: completed.slice(0, 3),
    upcomingGames: scheduled.slice(0, 3),
    todayGame: liveOrToday,
  };
}
