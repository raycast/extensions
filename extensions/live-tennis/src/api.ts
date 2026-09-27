import { getPreferenceValues } from "@raycast/api";

export const BASE_URL = "https://api.livetennisapi.com/api/public/v1";

// --- Types, mirroring https://docs.livetennisapi.com/openapi.yaml (v1). ---
// Additive changes ship within v1, so unknown fields are ignored by design.

export type Tour = "atp" | "wta" | "challenger" | "itf" | "juniors";

export interface Score {
  sets: number[];
  /** [games_p1, games_p2]; each a per-set list. Player-major. */
  games: number[][];
  /** In-game points as tennis strings ("0", "15", "40", "AD"). Entries can be null. */
  points: (string | null)[];
  server: 1 | 2 | null;
  is_tiebreak: boolean;
  timestamp: string | null;
  win_probability_p1?: number | null; // ULTRA only
  danger?: number | null; // ULTRA only
}

export interface Player {
  id: number;
  name: string;
  /** The record's OWN tour — opaque, NOT the tour filter vocabulary. */
  tour: string | null;
  country: string | null; // IOC-style lowercase 3-letter code, NOT ISO-3166
  ranking: number | null;
  ranking_points: number | null;
  ranking_movement: "up" | "down" | "same" | null;
  hand: "R" | "L" | null;
  birthday: string | null;
  is_doubles_team: boolean;
}

export interface Match {
  id: number;
  tournament: string;
  tournament_id: string | null;
  tour: Tour | null;
  surface: "hard" | "clay" | "grass" | null;
  indoor: boolean;
  is_doubles: boolean;
  round: string | null;
  round_code: string | null;
  format: "BO3" | "BO5" | null;
  status: "upcoming" | "live" | "completed" | "cancelled";
  event_status: "Retired" | "Cancelled" | "Walk Over" | "Postponed" | "Interrupted" | null;
  scheduled_time: string | null;
  players: { p1: Player; p2: Player };
  score: Score | null;
  winner: number | null;
  withdrew: number | null;
}

export interface Fixture {
  id: number;
  tournament: string | null;
  /** The record's OWN tour — opaque, NOT the tour filter vocabulary. */
  tour: string | null;
  surface: string | null;
  round: string | null;
  round_code: string | null;
  event_date: string | null;
  /** Scheduled start (UTC). Null until the order of play assigns a time. */
  start_time: string | null;
  status: string | null;
  player1_id: number | null;
  player1_name: string | null;
  player2_id: number | null;
  player2_name: string | null;
}

export interface ListMeta {
  count: number;
  limit: number;
  offset: number;
  total: number | null;
  has_more: boolean;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

interface ApiErrorBody {
  error?: string;
  detail?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

function messageFor(status: number, body: ApiErrorBody): string {
  switch (status) {
    case 401:
      return "Invalid API key. Check the key in the extension preferences — free keys are available at livetennisapi.com.";
    case 403:
      if (body.error === "upgrade_required") {
        return "This data requires a paid Live Tennis API plan.";
      }
      return body.detail ?? "Access denied.";
    case 429:
      return "Rate limit reached (free tier: 30 requests/min, 100 requests/day). Try again in a moment, or slow down auto-refresh in the command preferences.";
    default:
      return body.detail ?? `Request failed (HTTP ${status}).`;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { Authorization: `Bearer ${apiKey.trim()}` };
}

/** parseResponse for @raycast/utils useFetch: turn API errors into readable ones. */
export async function parseListResponse<T>(response: Response): Promise<ListResponse<T>> {
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body; fall through with the status alone
    }
    throw new ApiError(response.status, body.error, messageFor(response.status, body));
  }
  return (await response.json()) as ListResponse<T>;
}
