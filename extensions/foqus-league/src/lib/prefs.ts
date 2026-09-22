export type Preferences = {
  weekStartsOn: 0 | 1;
  menuBarFormat: "today" | "week" | "streak";
  dailyGoal: number;
  leagues: [number, number, number];
};

// What the parser accepts: the generated preference type and anything looser, such as test input.
export type RawPreferences = {
  weekStart?: string;
  menuBarFormat?: string;
  dailyGoal?: string;
  leagues?: string;
};

export const DEFAULT_LEAGUES: [number, number, number] = [600, 1200, 2400];

export function parseLeagues(raw: string | undefined): [number, number, number] {
  const mins = (raw ?? "").split(",").map((p) => Math.round(Number.parseFloat(p.trim()) * 60));
  const ok = mins.length === 3 && mins.every((n, i) => Number.isFinite(n) && n > 0 && (i === 0 || n > mins[i - 1]));
  return ok ? (mins as [number, number, number]) : DEFAULT_LEAGUES;
}

export const DEFAULT_DAILY_GOAL = 60;

export function parseDailyGoal(raw: string | undefined): number {
  const minutes = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_DAILY_GOAL;
}

export function parsePreferences(raw: RawPreferences): Preferences {
  const format = raw.menuBarFormat ?? "today";
  return {
    dailyGoal: parseDailyGoal(raw.dailyGoal),
    leagues: parseLeagues(raw.leagues),
    weekStartsOn: raw.weekStart === "sunday" ? 0 : 1,
    menuBarFormat: format === "week" || format === "streak" ? format : "today",
  };
}
