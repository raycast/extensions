import { steamFetch } from "./http";
import { decodeHtml } from "./util";

export type PlayerPoint = [ms: number, players: number];

export type PlayerMonth = { label: string; avg: number; gain?: number; gainPct?: number; peak: number };

export type PlayerHistory = {
  points: PlayerPoint[];
  peak24h?: number;
  allTimePeak?: number;
  months: PlayerMonth[];
};

export type TopGame = {
  chart: "now" | "weekly";
  rank: number;
  appid: number;
  players?: number;
  peak?: number;
  lastWeekRank?: number;
};

export type PlayerRange = "48h" | "1w" | "1m" | "max";

export const RANGE_DAYS: Record<PlayerRange, number | undefined> = { "48h": 2, "1w": 7, "1m": 30, max: undefined };
export const RANGE_TITLES: Record<PlayerRange, string> = {
  "48h": "48 Hours",
  "1w": "1 Week",
  "1m": "1 Month",
  max: "All Time",
};

export const DAY = 24 * 60 * 60 * 1000;

export const steamChartsUrl = (appid: number) => `https://steamcharts.com/app/${appid}`;
export const steamDbChartsUrl = (appid: number) => `https://steamdb.info/app/${appid}/charts/`;

// Steam answers result 42 for apps it has no count for
export async function getCurrentPlayers(appid: number) {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/");
  url.searchParams.set("appid", String(appid));
  const response = await steamFetch(url);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Steam could not load the player count (${response.status}).`);
  const body = (await response.json()) as { response?: { player_count?: number; result?: number } };
  return body.response?.result === 1 ? (body.response.player_count ?? 0) : undefined;
}

type ChartRank = { rank: number; appid: number; concurrent_in_game?: number; peak_in_game?: number };
type WeeklyRank = { rank: number; appid: number; last_week_rank?: number; peak_in_game?: number };

async function chartsRanks<T>(method: string) {
  const response = await steamFetch(`https://api.steampowered.com/ISteamChartsService/${method}/v1/`);
  if (!response.ok) throw new Error(`Steam could not load the most played games (${response.status}).`);
  const body = (await response.json()) as { response?: { ranks?: T[] } };
  return body.response?.ranks ?? [];
}

export async function getTopGames(kind: "now" | "weekly"): Promise<TopGame[]> {
  if (kind === "now") {
    const now = await chartsRanks<ChartRank>("GetGamesByConcurrentPlayers");
    return now.map((game) => ({
      chart: "now",
      rank: game.rank,
      appid: game.appid,
      players: game.concurrent_in_game,
      peak: game.peak_in_game,
    }));
  }
  // The weekly list has no live counts, so borrow them from the live list where the game is in both.
  // Live counts are optional here, so a failed live list still shows the weekly ranking.
  const [weekly, now] = await Promise.all([
    chartsRanks<WeeklyRank>("GetMostPlayedGames"),
    chartsRanks<ChartRank>("GetGamesByConcurrentPlayers").catch(() => [] as ChartRank[]),
  ]);
  const live = new Map(now.map((game) => [game.appid, game.concurrent_in_game]));
  return weekly.map((game) => ({
    chart: "weekly",
    rank: game.rank,
    appid: game.appid,
    players: live.get(game.appid),
    peak: game.peak_in_game,
    // 0 or below means Steam has no rank for last week
    lastWeekRank: game.last_week_rank && game.last_week_rank > 0 ? game.last_week_rank : undefined,
  }));
}

const number = (text?: string) => {
  const value = Number((text ?? "").replace(/[,%+\s]/g, ""));
  return text && Number.isFinite(value) && /\d/.test(text) ? value : undefined;
};

// Decode after stripping tags so a decoded &lt; can't form a tag; SteamCharts encodes "+" as &#43;
const cellText = (html: string) =>
  decodeHtml(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export function parseStatsPage(html: string) {
  const stats = [...html.matchAll(/class="app-stat"[\s\S]*?<span class="num">([^<]*)<\/span>/g)].map((match) =>
    number(decodeHtml(match[1])),
  );
  const body = html.match(/<table class="common-table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const months: PlayerMonth[] = [];
  for (const row of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cellText(cell[1]));
    if (cells.length < 5) continue;
    const avg = number(cells[1]);
    const peak = number(cells[4]);
    if (avg === undefined || peak === undefined) continue;
    months.push({ label: cells[0], avg, gain: number(cells[2]), gainPct: number(cells[3]), peak });
  }
  return { peak24h: stats[1], allTimePeak: stats[2], months };
}

function isPoints(value: unknown): value is PlayerPoint[] {
  return (
    Array.isArray(value) &&
    value.every((point) => Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number")
  );
}

// SteamCharts logs 0 for an hour it failed to record, so a lone 0 between real counts is a gap, not a low
const withoutGaps = (points: PlayerPoint[]) =>
  points.filter(([, players], index) => players > 0 || !(points[index - 1]?.[1] > 0 && points[index + 1]?.[1] > 0));

// SteamCharts is unofficial, so any failure means "no history" rather than an error
export async function getPlayerHistory(appid: number): Promise<PlayerHistory | undefined> {
  const [json, page] = await Promise.allSettled([
    steamFetch(`${steamChartsUrl(appid)}/chart-data.json`).then(async (response) => {
      if (!response.ok) return undefined;
      const body: unknown = await response.json();
      return isPoints(body) ? withoutGaps(body.sort((a, b) => a[0] - b[0])) : undefined;
    }),
    steamFetch(steamChartsUrl(appid)).then(async (response) =>
      response.ok ? parseStatsPage(await response.text()) : undefined,
    ),
  ]);
  const points = json.status === "fulfilled" ? json.value : undefined;
  const stats = page.status === "fulfilled" ? page.value : undefined;
  if (!points?.length && !stats?.months.length) return undefined;
  return {
    points: points ?? [],
    peak24h: stats?.peak24h,
    allTimePeak: stats?.allTimePeak,
    months: stats?.months ?? [],
  };
}

export const pointsInRange = (points: PlayerPoint[], days?: number) => {
  if (!days || !points.length) return points;
  // Anchored to the newest point, so a game SteamCharts stopped tracking still has a chart
  const since = points[points.length - 1][0] - days * DAY;
  return points.filter(([ms]) => ms >= since);
};

export type WindowStats = { peak: number; avg: number; low: number };

export function windowStats(points: PlayerPoint[], days?: number): WindowStats | undefined {
  const shown = pointsInRange(points, days);
  if (!shown.length) return undefined;
  const counts = shown.map(([, players]) => players);
  return {
    peak: Math.max(...counts),
    avg: Math.round(counts.reduce((sum, players) => sum + players, 0) / counts.length),
    low: Math.min(...counts),
  };
}

// For "last N days" answers: unlike the chart, the window ends now, so stale history gives nothing
export const recentStats = (points: PlayerPoint[], days: number) =>
  windowStats(points.filter(([ms]) => ms >= Date.now() - days * DAY));

// Older chart points are monthly averages, so all-time figures come from the monthly table
export function allTimeStats(history: PlayerHistory): WindowStats | undefined {
  if (!history.months.length) return windowStats(history.points);
  const months = history.months;
  return {
    peak: history.allTimePeak ?? Math.max(...months.map((month) => month.peak)),
    avg: Math.round(months.reduce((sum, month) => sum + month.avg, 0) / months.length),
    low: Math.round(Math.min(...months.map((month) => month.avg))),
  };
}

export function rangeStats(history: PlayerHistory, range: PlayerRange) {
  return range === "max" ? allTimeStats(history) : windowStats(history.points, RANGE_DAYS[range]);
}

export function changeVsLastWeek(points: PlayerPoint[], current?: number) {
  if (!points.length) return undefined;
  const now = Date.now();
  const target = now - 7 * DAY;
  // Without a live count, the newest point stands in for today only if it is recent
  const [lastMs, lastPlayers] = points[points.length - 1];
  const today = current ?? (now - lastMs <= DAY ? lastPlayers : undefined);
  if (today === undefined) return undefined;
  let closest: PlayerPoint | undefined;
  for (const point of points) {
    if (!closest || Math.abs(point[0] - target) < Math.abs(closest[0] - target)) closest = point;
  }
  // No point within a day of a week ago means the data is too sparse to compare
  if (!closest || Math.abs(closest[0] - target) > DAY || closest[1] <= 0) return undefined;
  return (today / closest[1] - 1) * 100;
}

export function peakMonth(history: PlayerHistory) {
  if (history.allTimePeak === undefined) return undefined;
  return history.months.find((month) => month.peak === history.allTimePeak)?.label;
}

export const formatPlayers = (players: number) => Math.round(players).toLocaleString("en-US");

export function compactPlayers(players: number) {
  if (players >= 1_000_000) return `${trim(players / 1_000_000)}M`;
  if (players >= 1_000) return `${trim(players / 1_000)}k`;
  return String(Math.round(players));
}

const trim = (value: number) => (value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, ""));

export const formatPercent = (pct: number) => `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
