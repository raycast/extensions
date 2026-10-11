export interface Bootstrap {
  events: Event[];
  teams: Team[];
  elements: Player[];
  element_types: ElementType[];
  total_players: number;
}

export interface Event {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_score: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  most_captained: number | null;
  most_selected: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  top_element_info: { id: number; points: number } | null;
}

export interface Team {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
}

export interface ElementType {
  id: number;
  singular_name: string;
  singular_name_short: string;
  plural_name: string;
  plural_name_short: string;
}

export type PlayerStatus = "a" | "d" | "i" | "s" | "u" | "n";

export interface PriceChangeProjection {
  offset: number;
  projected_percent: string;
  likelihood: number;
}

export interface Player {
  id: number;
  code: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  cost_change_event: number;
  cost_change_start: number;
  total_points: number;
  event_points: number;
  points_per_game: string;
  form: string;
  selected_by_percent: string;
  transfers_in_event: number;
  transfers_out_event: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  ict_index: string;
  ep_next: string;
  status: PlayerStatus;
  news: string;
  news_added: string | null;
  chance_of_playing_next_round: number | null;
  price_change_percent: string;
  price_change_hourly_rate: number;
  /** Newest part of the API; treated as optional so a missing field degrades to no projection */
  price_change_projections?: PriceChangeProjection[];
  price_change_locked_until: string | null;
  price_change_calibrating: boolean;
  in_dreamteam: boolean;
}

export interface Entry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  started_event: number;
  current_event: number | null;
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  summary_event_rank: number | null;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
  leagues: {
    classic: ClassicLeagueSummary[];
  };
}

export interface ClassicLeagueSummary {
  id: number;
  name: string;
  short_name: string | null;
  league_type: "s" | "x";
  scoring: string;
  entry_rank: number | null;
  entry_last_rank: number | null;
  entry_percentile_rank: number | null;
  rank_count: number | null;
  start_event: number;
}

export interface GameweekHistory {
  event: number;
  points: number;
  total_points: number;
  rank: number | null;
  overall_rank: number | null;
  percentile_rank: number | null;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface EntryHistory {
  current: GameweekHistory[];
  past: { season_name: string; total_points: number; rank: number }[];
  chips: { name: string; time: string; event: number }[];
}

export interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface Picks {
  active_chip: string | null;
  automatic_subs: { element_in: number; element_out: number; event: number }[];
  entry_history: GameweekHistory;
  picks: Pick[];
}

export interface Transfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  event: number;
  time: string;
}

export interface LiveStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  total_points: number;
}

export interface Live {
  elements: { id: number; stats: LiveStats }[];
}

export interface Fixture {
  id: number;
  event: number | null;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  stats: FixtureStat[];
}

export interface FixtureStat {
  identifier: string;
  h: { element: number; value: number }[];
  a: { element: number; value: number }[];
}

export interface ElementSummary {
  fixtures: {
    id: number;
    event: number | null;
    event_name: string | null;
    kickoff_time: string | null;
    team_h: number;
    team_a: number;
    is_home: boolean;
    difficulty: number;
  }[];
  history: {
    fixture: number;
    round: number;
    opponent_team: number;
    was_home: boolean;
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    bonus: number;
    team_h_score: number | null;
    team_a_score: number | null;
    expected_goals: string;
    expected_assists: string;
    value: number;
    selected: number;
  }[];
  history_past: {
    season_name: string;
    start_cost: number;
    end_cost: number;
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
  }[];
}

export interface LeagueStandings {
  league: { id: number; name: string };
  standings: {
    has_next: boolean;
    page: number;
    results: {
      entry: number;
      entry_name: string;
      player_name: string;
      rank: number;
      last_rank: number;
      event_total: number;
      total: number;
    }[];
  };
}
