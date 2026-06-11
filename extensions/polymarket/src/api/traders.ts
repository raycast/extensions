import { PublicProfile, LeaderboardEntry, Position, ClosedPosition } from "../features/traders/types";
import { Ticker } from "../features/markets/types";
import { POLY_URL, POLY_DATA_URL } from "../utils/constants";
import { fetchWithHandling } from "./polymarket";

/**
 * Searches for profiles matching a text query (username).
 * Uses the Data API leaderboard endpoint which supports prefix matching on userName.
 *
 * @param query The username or pseudonym to search for
 * @returns An array of matching PublicProfile objects
 */
export async function searchProfiles(query: string): Promise<PublicProfile[]> {
  const url = `${POLY_DATA_URL}v1/leaderboard?${new URLSearchParams({ userName: query, limit: "30" })}`;
  const entries = await fetchWithHandling<LeaderboardEntry[]>(url);

  return entries.map((entry) => ({
    proxyWallet: entry.proxyWallet,
    profileImage: entry.profileImage || null,
    displayUsernamePublic: true,
    bio: null,
    pseudonym: entry.userName || "Unknown",
    name: entry.userName || null,
    xUsername: entry.xUsername || null,
    verifiedBadge: entry.verifiedBadge || false,
  }));
}

/**
 * Retrieves a single user's public profile directly via their 0x wallet address.
 *
 * @param address The 42-character proxy wallet address
 * @returns A PublicProfile object
 */
export async function fetchPublicProfile(address: string): Promise<PublicProfile> {
  const url = `${POLY_URL}public-profile?${new URLSearchParams({ address })}`;
  return fetchWithHandling<PublicProfile>(url);
}

/**
 * Queries the Data API leaderboard for a specific user to retrieve PnL and rank,
 * or retrieves the global leaderboard if the user parameter is empty.
 *
 * @param user The user's wallet address (or empty string for global leaderboard)
 * @param category The leaderboard category (e.g., 'OVERALL', 'POLITICS')
 * @param timePeriod The timeframe for PnL calculation ('DAY', 'WEEK', 'MONTH', 'ALL')
 * @param limit Optional max results limit (defaults to API default if undefined)
 * @returns An array containing the leaderboard entries
 */
export async function fetchLeaderboard(
  user: string,
  category: string,
  timePeriod: string,
  limit?: number,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ category, timePeriod });
  if (user) {
    params.append("user", user);
  }
  if (limit) {
    params.append("limit", limit.toString());
  }
  const url = `${POLY_DATA_URL}v1/leaderboard?${params}`;
  return fetchWithHandling<LeaderboardEntry[]>(url);
}

/**
 * Fetches a paginated list of the user's open (active) market positions.
 *
 * @param user The user's wallet address
 * @param sortBy Field to sort by (defaults to "CURRENT" value)
 * @param sortDirection Sort direction (defaults to "DESC")
 * @param limit Max results per page (max 50)
 * @param offset Number of items to skip for pagination
 * @param title Optional query keyword to filter positions by market name
 * @returns Array of active Position objects
 */
export async function fetchPositions(
  user: string,
  sortBy: string = "CURRENT",
  sortDirection: string = "DESC",
  limit: number = 50,
  offset: number = 0,
  title?: string,
): Promise<Position[]> {
  const params = new URLSearchParams({
    user,
    sortBy,
    sortDirection,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (title) {
    params.append("title", title);
  }
  const url = `${POLY_DATA_URL}positions?${params}`;
  return fetchWithHandling<Position[]>(url);
}

/**
 * Fetches a paginated list of the user's completed/closed trades.
 * Useful for reviewing historic trade realized PnL.
 *
 * @param user The user's wallet address
 * @param sortBy Field to sort by (defaults to "TIMESTAMP")
 * @param sortDirection Sort direction (defaults to "DESC")
 * @param limit Max results per page (50)
 * @param offset Number of items to skip for pagination
 * @param title Optional query keyword to filter closed positions
 * @returns Array of ClosedPosition objects
 */
export async function fetchClosedPositions(
  user: string,
  sortBy: string = "TIMESTAMP",
  sortDirection: string = "DESC",
  limit: number = 50,
  offset: number = 0,
  title?: string,
): Promise<ClosedPosition[]> {
  const params = new URLSearchParams({
    user,
    sortBy,
    sortDirection,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (title) {
    params.append("title", title);
  }
  const url = `${POLY_DATA_URL}closed-positions?${params}`;
  return fetchWithHandling<ClosedPosition[]>(url);
}

/**
 * Fetches the overarching Event (Ticker) containing the specific Markets.
 * Handles the fact that position slugs are market slugs, not event slugs,
 * by first querying the market to resolve its parent event slug.
 *
 * @param slug The unique market or event slug mapped to a position.
 * @returns A Ticker object, or null if the event was not found.
 */
export async function fetchEventTicker(slug: string): Promise<Ticker | null> {
  // First, attempt to fetch the market to get the parent event slug
  const marketUrl = `${POLY_URL}markets?${new URLSearchParams({ slug })}`;
  const marketsResponse = await fetchWithHandling<{ events?: { slug: string }[] }[]>(marketUrl);

  let eventSlug = slug;
  if (
    marketsResponse &&
    marketsResponse.length > 0 &&
    marketsResponse[0].events &&
    marketsResponse[0].events.length > 0
  ) {
    eventSlug = marketsResponse[0].events[0].slug;
  }

  // Now fetch the actual requested event ticker
  const url = `${POLY_URL}events?${new URLSearchParams({ slug: eventSlug })}`;
  const events = await fetchWithHandling<Ticker[]>(url);
  return events && events.length > 0 ? events[0] : null;
}
