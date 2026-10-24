import { scanPageComplete, withPagination } from "../lib/schema";
import { CompactRatingItem, toCompactRating } from "./compact-media";
import { describeRatingScope, pickRatingMatches } from "./rating-lookup";
import { describeMedia, identifyTraktIdKinds, isMatchableTitle } from "./resolve-media";
import { executeToolCall, TRAKT_LOOKUP_PAGE_SIZE, toolTraktClient } from "./tool-client";
import { resolveLookupQuery } from "./title-text";

type Input = {
  /**
   * Filter ratings by media type: "movies", "shows", "seasons", "episodes", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "seasons" | "episodes" | "all";
  /**
   * Filter for a specific rating score between 1 and 10 (e.g. 10 for all 10/10 items).
   * Must be a whole number. On a title lookup this never hides other scores: a film
   * rated 8 is not reported as unrated when you asked for 10.
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
   * Movie, show and episode IDs overlap: pass `type` ("movies", "shows" or "episodes")
   * with this field. A bare ID with `type: "all"` is refused. Season IDs cannot be
   * looked up (`/search/trakt/:id` does not return seasons); use `query` instead.
   */
  traktId?: number;
  /**
   * Optional release year. Use it when several identically named titles are rated
   * (e.g. "Dune" 2021 vs 1984). A miss for that year is not a "never rated".
   * A year stuffed into `query` ("Dune 1989") is parsed the same way.
   */
  year?: number;
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
  /**
   * True only for a rating whose title matches the query outright, or for the requested
   * `traktId`. Entries that merely contain the query stay in `ratings` without making this true.
   */
  found?: boolean;
  /**
   * Same as `found`: the queried title itself is rated. Related sequels or episodes do not
   * count.
   */
  rated?: boolean;
  /**
   * Set only when exactly one exact-title (or ID) match exists.
   */
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

function assertOptionalIntegerRating(rating: number | undefined): number | undefined {
  if (rating === undefined) return undefined;
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new Error(`Rating filter must be a whole number between 1 and 10 (received ${rating}).`);
  }
  return rating;
}

/**
 * Get ratings you have given to movies, TV shows, seasons, or episodes on Trakt,
 * or check the score of a specific title. Season rows can be listed or found by
 * `query`; they cannot be rated or unrated through `rate-media` / `remove-rating`.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", rating, query, traktId, year, page = 1, limit = 30 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeRating = assertOptionalIntegerRating(rating);

  // Fast path: search for a specific title or traktId in ratings
  if (query || traktId) {
    if (traktId !== undefined && type === "all") {
      return {
        found: false,
        rated: false,
        exhaustive: false,
        message:
          `Trakt ID ${traktId} cannot be looked up with \`type: "all"\`: movie, show and episode ` +
          `IDs overlap. Pass \`type: "movies"\`, \`"shows"\` or \`"episodes"\` instead of ` +
          `answering from this ID.`,
        ratings: [],
        hasMore: false,
      };
    }

    if (traktId !== undefined && (type === "movies" || type === "shows")) {
      const kinds = await identifyTraktIdKinds(traktId);
      const wanted = type === "movies" ? "movie" : "show";
      if (kinds.length > 0 && !kinds.includes(wanted)) {
        const actual = kinds[0] === "movie" ? "movie" : "show";
        return {
          found: false,
          rated: false,
          exhaustive: false,
          message:
            `Trakt ID ${traktId} is a ${actual}, not a ${wanted}. ` +
            `Call again with \`type: "${actual === "movie" ? "movies" : "shows"}"\`. Do not answer from this call.`,
          ratings: [],
          hasMore: false,
        };
      }
    }

    if (traktId !== undefined && type === "seasons") {
      return {
        found: false,
        rated: false,
        exhaustive: false,
        message:
          `Trakt season IDs cannot be looked up: /search/trakt/:id does not return seasons. ` +
          `Use \`query\` with \`type: "seasons"\` instead of answering from this ID.`,
        ratings: [],
        hasMore: false,
      };
    }

    if (traktId !== undefined && type === "episodes") {
      try {
        await describeMedia("episode", traktId);
      } catch {
        return {
          found: false,
          rated: false,
          exhaustive: false,
          message: `Trakt ID ${traktId} is not an episode. Pass the matching \`type\` instead of answering from this call.`,
          ratings: [],
          hasMore: false,
        };
      }
    }

    if (query && traktId === undefined && !isMatchableTitle(resolveLookupQuery(query, year).text ?? query)) {
      return {
        found: false,
        rated: false,
        exhaustive: false,
        message:
          `The title ${JSON.stringify(query)} cannot be compared: after normalization it has no letters or digits. ` +
          `This is NOT a confirmed absence from your ratings.`,
        ratings: [],
        hasMore: false,
      };
    }

    const scanned: CompactRatingItem[] = [];
    const maxPages = 100;
    const pageSize = TRAKT_LOOKUP_PAGE_SIZE;
    let exhaustive = false;

    // A title lookup always reads the unfiltered ratings list. Applying `rating` on the
    // request would hide an 8 and let a "never rated" answer through for `rating: 10`.
    for (let p = 1; p <= maxPages; p++) {
      const res = await executeToolCall(
        (signal) =>
          toolTraktClient.sync.getRatings({
            params: { type },
            query: { page: p, limit: pageSize, extended: "full" },
            fetchOptions: { signal },
          }),
        "Failed to search user ratings",
      );

      const paginated = withPagination(res);
      scanned.push(...paginated.data.map(toCompactRating));

      if (scanPageComplete(paginated.data.length, paginated.pagination, pageSize)) {
        exhaustive = true;
        break;
      }
    }

    const { exact, related, yearHeldBy, yearUnknown, scoreMismatched } = pickRatingMatches(
      scanned,
      query,
      traktId,
      year,
      safeRating,
    );
    const rated = exact.length > 0 || scoreMismatched.length > 0;
    const lookup = resolveLookupQuery(query, year);
    const target = query ? `"${query}"` : `ID ${traktId}`;
    const yearLabel = lookup.year !== undefined ? ` (${lookup.year})` : "";
    const userRating = exact.length === 1 ? exact[0].rating : undefined;
    const plural = (count: number) => (count === 1 ? "y" : "ies");
    const scope = describeRatingScope(type);
    const shown = [...exact, ...scoreMismatched, ...yearHeldBy, ...yearUnknown, ...related].slice(0, safeLimit);

    let message: string;
    if (exact.length > 0) {
      message =
        related.length > 0
          ? `Found ${exact.length} rating(s) titled ${target}${yearLabel}, plus ${related.length} related ` +
            `entr${plural(related.length)} whose title contains it.`
          : `Found ${exact.length} rating(s) matching ${target}${yearLabel}.`;
    } else if (scoreMismatched.length > 0) {
      const scores = [...new Set(scoreMismatched.map((item) => item.rating))].sort((a, b) => b - a).join(", ");
      message = `${target}${yearLabel} is rated ${scores}/10, not ${safeRating}/10. ` + `Do not report it as unrated.`;
    } else if (yearHeldBy.length > 0) {
      const known = yearHeldBy
        .map((item) => `"${item.title}"${item.year ? ` (${item.year})` : ""} ${item.rating}/10`)
        .join(", ");
      message =
        `${target} is rated, but not for ${lookup.year}: ${known}. ` +
        `Ask which release they mean instead of reporting a never-rated verdict.`;
    } else if (yearUnknown.length > 0) {
      message =
        `${target} is rated, but Trakt did not give a year for ` +
        `${yearUnknown.map((item) => `"${item.title}" ${item.rating}/10`).join(", ")}, so this is NOT proof it is ` +
        `the ${lookup.year} release and NOT a never-rated verdict.`;
    } else if (related.length > 0) {
      message =
        `${target} itself is not rated, but ${related.length} related entr${plural(related.length)} ` +
        `share part of that title: ${related.map((item) => `"${item.title}"`).join(", ")}. Ask the user ` +
        `whether they meant one of those rather than answering with a flat no.`;
    } else if (exhaustive) {
      message = `Confirmed: you have never rated ${target}${yearLabel} (searched ${scope}).`;
    } else {
      message = `No rating found for ${target}${yearLabel}, but not every rating could be scanned. This result is NOT definitive.`;
    }

    return {
      found: rated,
      rated,
      userRating,
      // A year miss is a fact about that year, not a never-rated. Leaving exhaustive
      // true here would make the assistant trust a negative the way it does on history.
      exhaustive: exhaustive && (rated || (yearHeldBy.length === 0 && yearUnknown.length === 0)),
      message,
      ratings: shown,
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
    exhaustive: false,
    message:
      "These are only a page of ratings. Never conclude that a title was not rated from this list; use the `query` parameter for a definitive check.",
    ratings,
    page,
    hasMore,
  };
}
