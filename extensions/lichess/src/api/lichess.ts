import type { LichessGame } from "../types/lichess";
import { LICHESS_API_BASE_URL, LichessApiError, parseNdjson } from "./client";

export { LichessApiError } from "./client";
export type { CreateSeekOptions } from "./realtimeSeek";
export { createRealtimeBoardSeek } from "./realtimeSeek";

export async function fetchRecentGames(username: string, max = 15): Promise<LichessGame[]> {
  const normalizedUsername = username.trim();
  const url = new URL(`${LICHESS_API_BASE_URL}/games/user/${encodeURIComponent(normalizedUsername)}`);

  url.searchParams.set("max", String(max));
  url.searchParams.set("pgnInJson", "true");
  url.searchParams.set("opening", "true");
  url.searchParams.set("evals", "false");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("sort", "dateDesc");

  const response = await fetch(url, {
    headers: {
      Accept: "application/x-ndjson",
    },
  });

  if (response.status === 404) {
    throw new LichessApiError(`Lichess user "${normalizedUsername}" was not found.`, response.status);
  }

  if (!response.ok) {
    throw new LichessApiError(`Lichess returned HTTP ${response.status}.`, response.status);
  }

  const body = await response.text();
  return parseNdjson<LichessGame>(body);
}
