import type {
  Bootstrap,
  ElementSummary,
  ElementType,
  Entry,
  EntryHistory,
  Event,
  Fixture,
  LeagueStandings,
  Live,
  LiveStats,
  Picks,
  Player,
  Team,
  Transfer,
} from "./types";

const API = "https://fantasy.premierleague.com/api";
export const SITE = "https://fantasy.premierleague.com";

export class FplError extends Error {
  constructor(
    public readonly status: number,
    path: string,
  ) {
    super(`FPL API responded ${status} for ${path}`);
  }
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new FplError(response.status, path);
  return (await response.json()) as T;
}

// Raycast caps a command at 100 MB of heap and caches hook results as JSON, so the
// bootstrap payload (109 fields per player) is trimmed to the fields declared in types.ts.
const PLAYER_KEYS: Record<keyof Player, true> = {
  id: true,
  code: true,
  first_name: true,
  second_name: true,
  web_name: true,
  team: true,
  element_type: true,
  now_cost: true,
  cost_change_event: true,
  cost_change_start: true,
  total_points: true,
  event_points: true,
  points_per_game: true,
  form: true,
  selected_by_percent: true,
  transfers_in_event: true,
  transfers_out_event: true,
  minutes: true,
  goals_scored: true,
  assists: true,
  clean_sheets: true,
  bonus: true,
  expected_goals: true,
  expected_assists: true,
  expected_goal_involvements: true,
  ict_index: true,
  ep_next: true,
  status: true,
  news: true,
  news_added: true,
  chance_of_playing_next_round: true,
  price_change_percent: true,
  price_change_hourly_rate: true,
  price_change_projections: true,
  price_change_locked_until: true,
  price_change_calibrating: true,
  in_dreamteam: true,
};
const EVENT_KEYS: Record<keyof Event, true> = {
  id: true,
  name: true,
  deadline_time: true,
  average_entry_score: true,
  finished: true,
  data_checked: true,
  highest_score: true,
  is_previous: true,
  is_current: true,
  is_next: true,
  most_captained: true,
  most_selected: true,
  most_transferred_in: true,
  top_element: true,
  top_element_info: true,
};
const TEAM_KEYS: Record<keyof Team, true> = {
  id: true,
  code: true,
  name: true,
  short_name: true,
  strength_overall_home: true,
  strength_overall_away: true,
};
const ELEMENTTYPE_KEYS: Record<keyof ElementType, true> = {
  id: true,
  singular_name: true,
  singular_name_short: true,
  plural_name: true,
  plural_name_short: true,
};
const LIVESTATS_KEYS: Record<keyof LiveStats, true> = {
  minutes: true,
  goals_scored: true,
  assists: true,
  clean_sheets: true,
  goals_conceded: true,
  yellow_cards: true,
  red_cards: true,
  saves: true,
  bonus: true,
  bps: true,
  total_points: true,
};

function pick<T extends object>(source: T, keys: Record<keyof T, true>): T {
  const result = {} as T;
  for (const key of Object.keys(keys) as (keyof T)[]) result[key] = source[key];
  return result;
}

export const fetchBootstrap = async (): Promise<Bootstrap> => {
  const raw = await get<Bootstrap>("/bootstrap-static/");
  return {
    total_players: raw.total_players,
    events: raw.events.map((e) => pick(e, EVENT_KEYS)),
    teams: raw.teams.map((t) => pick(t, TEAM_KEYS)),
    element_types: raw.element_types.map((t) => pick(t, ELEMENTTYPE_KEYS)),
    elements: raw.elements.map((p) => pick(p, PLAYER_KEYS)),
  };
};
export const fetchEntry = (entryId: number) => get<Entry>(`/entry/${entryId}/`);
export const fetchEntryHistory = (entryId: number) => get<EntryHistory>(`/entry/${entryId}/history/`);
export const fetchPicks = (entryId: number, event: number) => get<Picks>(`/entry/${entryId}/event/${event}/picks/`);
export const fetchTransfers = (entryId: number) => get<Transfer[]>(`/entry/${entryId}/transfers/`);
export const fetchLive = async (event: number): Promise<Live> => {
  const raw = await get<Live>(`/event/${event}/live/`);
  return { elements: raw.elements.map((e) => ({ id: e.id, stats: pick(e.stats, LIVESTATS_KEYS) })) };
};
export const fetchFixtures = (event?: number) => get<Fixture[]>(event ? `/fixtures/?event=${event}` : "/fixtures/");
export const fetchElementSummary = (playerId: number) => get<ElementSummary>(`/element-summary/${playerId}/`);
export const fetchLeagueStandings = (leagueId: number, page = 1) =>
  get<LeagueStandings>(`/leagues-classic/${leagueId}/standings/?page_standings=${page}`);

export const entryUrl = (entryId: number, event?: number | null) =>
  event ? `${SITE}/entry/${entryId}/event/${event}` : `${SITE}/entry/${entryId}/history`;
export const leagueUrl = (leagueId: number) => `${SITE}/leagues/${leagueId}/standings/c`;
export const fixturesUrl = (event: number) => `${SITE}/fixtures/${event}`;
export const transfersUrl = `${SITE}/transfers`;
export const myTeamUrl = `${SITE}/my-team`;
