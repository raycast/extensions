import { withPagination } from "../lib/schema";
import { CompactRatingItem, toCompactRating } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Filter ratings by media type: "movies", "shows", "seasons", "episodes", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "seasons" | "episodes" | "all";
  /**
   * Filter for a specific rating score between 1 and 10 (e.g. 10 for all 10/10 items).
   */
  rating?: number;
  /**
   * Search for a specific title directly within your ratings (e.g. "what rating did I give to Severance?").
   * ALWAYS use this when checking what score you gave to a specific movie or show.
   * Do NOT paginate manually when looking for a specific title; use this parameter instead.
   */
  query?: string;
  /**
   * Optional Trakt ID to check your rating for a specific item.
   */
  traktId?: number;
  /**
   * The page number for paginated results (when listing items). Defaults to 1.
   */
  page?: number;
  /**
   * Number of items to return per page (default: 30, max: 100).
   */
  limit?: number;
};

type Output = {
  found?: boolean;
  userRating?: number;
  /**
   * True when every rating was inspected, making a negative answer definitive.
   */
  exhaustive?: boolean;
  message?: string;
  ratings: CompactRatingItem[];
  page?: number;
  hasMore: boolean;
};

/**
 * Get ratings you have given to movies, TV shows, seasons, or episodes on Trakt,
 * or check the score of a specific title.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", rating, query, traktId, page = 1, limit = 30 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  // Validate rating if provided
  const safeRating = rating !== undefined ? Math.min(Math.max(Math.round(rating), 1), 10) : undefined;

  // Fast path: search for a specific title or traktId in ratings
  if (query || traktId) {
    const normalizedQuery = query?.trim().toLowerCase();
    const matchedRatings: CompactRatingItem[] = [];
    const maxPages = 20;
    const pageSize = 100;
    let exhaustive = false;

    for (let p = 1; p <= maxPages; p++) {
      const res = await executeToolCall((signal) => {
        if (safeRating !== undefined) {
          return toolTraktClient.sync.getRatingsByRating({
            params: { type, rating: safeRating },
            query: { page: p, limit: pageSize, extended: "full" },
            fetchOptions: { signal },
          });
        }
        return toolTraktClient.sync.getRatings({
          params: { type },
          query: { page: p, limit: pageSize, extended: "full" },
          fetchOptions: { signal },
        });
      }, "Failed to search user ratings");

      const paginated = withPagination(res);

      for (const rawItem of paginated.data) {
        const item = toCompactRating(rawItem);
        let matches = false;

        if (traktId !== undefined && item.traktId === traktId) {
          matches = true;
        } else if (normalizedQuery) {
          if (item.title.toLowerCase().includes(normalizedQuery)) {
            matches = true;
          } else if (item.episode?.title?.toLowerCase().includes(normalizedQuery)) {
            matches = true;
          }
        }

        if (matches) {
          matchedRatings.push(item);
        }
      }

      if (paginated.data.length < pageSize || p >= paginated.pagination["x-pagination-page-count"]) {
        exhaustive = true;
        break;
      }
    }

    const found = matchedRatings.length > 0;
    const target = query ? `"${query}"` : `ID ${traktId}`;
    const userRating = matchedRatings.length === 1 ? matchedRatings[0].rating : undefined;

    let message: string;
    if (found) {
      message = `Found ${matchedRatings.length} rating(s) matching ${target}.`;
    } else if (exhaustive) {
      message = `Confirmed: you have never rated ${target} (searched every rating).`;
    } else {
      message = `No rating found for ${target}, but not every rating could be scanned. This result is NOT definitive.`;
    }

    return {
      found,
      userRating,
      exhaustive,
      message,
      ratings: matchedRatings.slice(0, safeLimit),
      hasMore: false,
    };
  }

  // Browse list mode
  const res = await executeToolCall((signal) => {
    if (safeRating !== undefined) {
      return toolTraktClient.sync.getRatingsByRating({
        params: { type, rating: safeRating },
        query: { page, limit: safeLimit, extended: "full" },
        fetchOptions: { signal },
      });
    }
    return toolTraktClient.sync.getRatings({
      params: { type },
      query: { page, limit: safeLimit, extended: "full" },
      fetchOptions: { signal },
    });
  }, "Failed to fetch user ratings");

  const paginated = withPagination(res);
  const ratings = paginated.data.map(toCompactRating);
  const hasMore = page < paginated.pagination["x-pagination-page-count"];

  return {
    ratings,
    page,
    hasMore,
  };
}
