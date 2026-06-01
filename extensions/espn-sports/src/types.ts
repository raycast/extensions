export interface LeagueConfig {
  value: string;
  label: string;
  sport: string;
  league: string;
}

// ─── Teams API ────────────────────────────────────────────────────────────────

export interface TeamLogo {
  href: string;
  rel?: string[];
}

export interface TeamLink {
  rel: string[];
  href: string;
}

export interface EspnTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  color?: string;
  logos?: TeamLogo[];
  links?: TeamLink[];
}

export interface TeamsApiResponse {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{ team: EspnTeam }>;
    }>;
  }>;
}

// ─── Schedule API ─────────────────────────────────────────────────────────────

export interface ScheduleCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string | { displayValue: string };
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    location?: string;
    logos?: Array<{ href: string }>;
  };
}

export interface ScheduleEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  week?: { number: number; text: string };
  status: {
    type: {
      name: string; // STATUS_SCHEDULED | STATUS_FINAL | STATUS_POSTPONED | STATUS_CANCELLED | etc.
      completed?: boolean;
      description?: string;
      detail?: string;
    };
  };
  competitions: Array<{
    competitors: ScheduleCompetitor[];
    venue?: { fullName: string };
    broadcasts?: Array<{ names: string[] }>;
    status?: { type?: { completed?: boolean; name?: string } };
  }>;
}

export interface ScheduleResponse {
  team?: {
    id: string;
    abbreviation: string;
    location: string;
    name: string;
    recordSummary?: string;
    standingSummary?: string;
  };
  season?: { year: number; displayName: string };
  events?: ScheduleEvent[];
}

// ─── Roster API ───────────────────────────────────────────────────────────────

export interface RosterPlayer {
  id: string;
  displayName: string;
  jersey?: string;
  headshot?: { href: string };
  position?: { abbreviation: string; displayName?: string };
  links?: Array<{ href: string; rel?: string[] }>;
}

// Some sports return athletes flat; others group by position unit
export interface RosterGroup {
  position?: string;
  items?: RosterPlayer[];
}

export interface RosterApiResponse {
  athletes?: RosterPlayer[] | RosterGroup[];
}

// ─── Overview / Stats API ─────────────────────────────────────────────────────

export interface StatsSplit {
  displayName: string;
  stats: (number | string)[];
}

export interface StatsBlock {
  displayName?: string;
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  splits?: StatsSplit[];
}

// Per-game stats entry from overview.gameLog.statistics[].events[]
export interface GameLogStatEvent {
  eventId: string;
  stats: string[];
}

export interface GameLogStatGroup {
  displayName?: string;
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  events?: GameLogStatEvent[];
}

export interface OverviewResponse {
  statistics?: StatsBlock | StatsBlock[];
  gameLog?: {
    displayName?: string;
    statistics?: GameLogStatGroup[];
  };
}

// ─── Gamelog API (game metadata) ──────────────────────────────────────────────

export interface GamelogEvent {
  id: string;
  week?: number;
  atVs?: string;
  gameDate?: string;
  score?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamScore?: string;
  awayTeamScore?: string;
  gameResult?: string;
  eventNote?: string;
  opponent?: {
    id: string;
    abbreviation: string;
    displayName?: string;
    logos?: Array<{ href: string }>;
  };
  team?: { id: string; abbreviation: string };
}

export interface GamelogResponse {
  labels?: string[];
  names?: string[];
  displayNames?: string[];
  events?: Record<string, GamelogEvent>;
}

// ─── Search API ───────────────────────────────────────────────────────────────

export interface SearchContent {
  id: string;
  uid?: string;
  type: string;
  displayName: string;
  subtitle?: string;
  sport?: string;
  defaultLeagueSlug?: string;
  image?: { default: string; defaultDark?: string };
  link?: { web: string; app?: string };
}

export interface SearchResultGroup {
  type: string;
  totalFound?: number;
  contents: SearchContent[];
}

export interface SearchApiResponse {
  results?: SearchResultGroup[];
}
