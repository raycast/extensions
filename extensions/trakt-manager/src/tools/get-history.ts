import { TraktMovieHistoryList, TraktShowHistoryList, withPagination } from "../lib/schema";
import { CompactHistoryItem, toCompactMovieHistory, toCompactShowHistory } from "./compact-media";
import { pickCandidates, uniqueYears, type CandidatePick, type HistoryCandidate } from "./history-candidates";
import { isMatchableTitle, searchMovieCandidates, searchShowCandidates } from "./resolve-media";
import { resolveLookupQuery } from "./title-text";
import { executeToolCall, executeToolCallAllowingNotFound, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Filter history by media type: "movies", "shows", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "all";
  /**
   * Title to look up in your complete watch history (e.g. "Green Book", "Breaking Bad").
   * Use this to answer "have I watched X?" or "when did I watch X?".
   * It resolves the title to a Trakt ID and queries the full history for that exact item, so a
   * negative answer is authoritative whenever the response reports `exhaustive: true`. Titles
   * with many identically named releases can come back `exhaustive: false` instead.
   */
  query?: string;
  /**
   * Optional release year to disambiguate titles that exist in several versions (e.g. Dune 1984 vs 2021).
   * A year stuffed into `query` ("Dune 1989", "Dune (1989)") is parsed the same way.
   */
  year?: number;
  /**
   * Optional Trakt ID of a movie or show to look up directly. Skips title resolution.
   * Movie and show IDs overlap and are not interchangeable: always pass `type` ("movies"
   * or "shows") with this field. A bare ID with the default `type: "all"` is resolved to
   * one namespace, and refused when the number exists in both.
   */
  traktId?: number;
  /**
   * The page number when browsing recent history. Defaults to 1.
   */
  page?: number;
  /**
   * Number of items to return per page (default: 20, max: 50).
   */
  limit?: number;
};

type WatchCheck = {
  type: "movie" | "show";
  title: string;
  year?: number;
  traktId: number;
  watched: boolean;
  /**
   * Total recorded watch events for this item (episode plays for a show).
   */
  plays: number;
  lastWatchedAt?: string;
  firstWatchedAt?: string;
};

type Output = {
  /**
   * "lookup" when checking specific titles, "browse" when listing recent history.
   */
  mode: "lookup" | "browse";
  /**
   * True when the answer covers the ENTIRE history and can be trusted as definitive.
   */
  exhaustive: boolean;
  /**
   * True when the lookup resolved at least one item. A title can be found and still
   * unwatched (`wasWatched: false`). False only when nothing matching the request exists.
   */
  found?: boolean;
  wasWatched?: boolean;
  message?: string;
  /**
   * One entry per resolved item, with a definitive watched / not watched verdict.
   */
  checked?: WatchCheck[];
  history: CompactHistoryItem[];
  page?: number;
  hasMore: boolean;
};

type Candidate = HistoryCandidate;

type CandidateSelection = {
  candidates: Candidate[];
  /**
   * Years that do exist for the requested title, filled in only when the caller asked for a
   * year that matched nothing. Lets the caller report the mismatch instead of guessing.
   */
  missedYears: number[];
  /**
   * Releases that share the requested title exactly but were left unchecked because of
   * `EXACT_MATCH_CHECK_CAP`. A "not watched" verdict cannot be called exhaustive while any of
   * these remain, since the user may mean one of them. Kept as candidates rather than years,
   * because a release with no year on Trakt still has to count as unchecked.
   */
  unchecked: Candidate[];
  /**
   * True when either search page is full, so a requested year may exist under a related
   * title that ranked out of reach. Used only for the year-mismatch path.
   */
  truncated: boolean;
  /**
   * True when the exact-title search itself hit its cap. A "not watched" verdict then
   * rests on same-title releases we never saw. A full relevance page alone does not set
   * this — all four films titled "Dune" come back from `/exact`.
   */
  exactTruncated: boolean;
  /**
   * True when at least one search returned a release, even if none survived the year filter.
   * Distinguishes "this title exists for other years" from "Trakt has never heard of it".
   */
  titleExists: boolean;
  /**
   * True when no release shares the query's exact title, so the candidates are only
   * the closest ranked guesses. A negative verdict cannot be exhaustive in that case.
   */
  approximated: boolean;
  /**
   * Releases from the requested year whose title is not the query. Checking them would
   * produce a verdict about "Dune: Part Three" while the user asked for "Dune" 2026.
   */
  yearHeldBy: Candidate[];
};

async function resolveCandidates(
  query: string,
  year: number | undefined,
  type: "movies" | "shows" | "all",
): Promise<CandidateSelection> {
  const picks: CandidatePick[] = [];
  const missed = new Set<number>();
  const yearHeldBy: Candidate[] = [];
  let truncated = false;
  let exactTruncated = false;
  let titleExists = false;

  const lookup = resolveLookupQuery(query, year);
  const searchText = lookup.text ?? query;

  if (type === "movies" || type === "all") {
    const found = await searchMovieCandidates(searchText);
    titleExists = titleExists || found.candidates.length > 0;
    const selection = pickCandidates(
      found.candidates.map((item) => ({ type: "movie" as const, ...item })),
      query,
      year,
    );
    picks.push(selection);
    selection.missedYears.forEach((value) => missed.add(value));
    yearHeldBy.push(...selection.yearHeldBy);
    truncated = truncated || found.truncated;
    exactTruncated = exactTruncated || found.exactTruncated;
  }

  if (type === "shows" || type === "all") {
    const found = await searchShowCandidates(searchText);
    titleExists = titleExists || found.candidates.length > 0;
    const selection = pickCandidates(
      found.candidates.map((item) => ({ type: "show" as const, ...item })),
      query,
      year,
    );
    picks.push(selection);
    selection.missedYears.forEach((value) => missed.add(value));
    yearHeldBy.push(...selection.yearHeldBy);
    truncated = truncated || found.truncated;
    exactTruncated = exactTruncated || found.exactTruncated;
  }

  const exactPicks = picks.filter((pick) => !pick.approximated && pick.candidates.length > 0);
  const used = exactPicks.length > 0 ? exactPicks : picks;
  const approximated = exactPicks.length === 0 && used.some((pick) => pick.approximated);

  return {
    candidates: used.flatMap((pick) => pick.candidates),
    missedYears: [...missed].sort((a, b) => a - b),
    unchecked: used.flatMap((pick) => pick.unchecked),
    truncated,
    exactTruncated,
    titleExists,
    approximated,
    yearHeldBy,
  };
}

/**
 * Query the complete watch history of one specific item.
 * Trakt returns an empty array when the ID is valid but was never watched,
 * which makes a negative result definitive.
 */
async function probeCandidate(
  candidate: Candidate,
): Promise<{ check: WatchCheck; events: CompactHistoryItem[] } | undefined> {
  if (candidate.type === "movie") {
    const res = await executeToolCallAllowingNotFound(
      (signal) =>
        toolTraktClient.movies.getMovieHistoryForItem({
          params: { id: candidate.traktId },
          query: { page: 1, limit: 20, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to look up watch history for "${candidate.title}"`,
    );
    if (!res) return undefined;

    const paginated = withPagination({ ...res, body: res.body as TraktMovieHistoryList });
    const events = paginated.data.map(toCompactMovieHistory);
    const plays = paginated.pagination["x-pagination-item-count"] || events.length;
    const timestamps = events.map((event) => event.watchedAt).filter((value): value is string => Boolean(value));

    return {
      check: {
        type: "movie",
        title: candidate.title,
        year: candidate.year,
        traktId: candidate.traktId,
        watched: plays > 0,
        plays,
        lastWatchedAt: timestamps[0],
        // Only the first page is loaded, so the oldest event here is the true first watch
        // only when every play fits on it.
        firstWatchedAt: plays <= events.length ? timestamps[timestamps.length - 1] : undefined,
      },
      events,
    };
  }

  const res = await executeToolCallAllowingNotFound(
    (signal) =>
      toolTraktClient.shows.getShowHistoryForItem({
        params: { id: candidate.traktId },
        query: { page: 1, limit: 20, extended: "full" },
        fetchOptions: { signal },
      }),
    `Failed to look up watch history for "${candidate.title}"`,
  );
  if (!res) return undefined;

  const paginated = withPagination({ ...res, body: res.body as TraktShowHistoryList });
  const events = paginated.data.map(toCompactShowHistory);
  const plays = paginated.pagination["x-pagination-item-count"] || events.length;
  const timestamps = events.map((event) => event.watchedAt).filter((value): value is string => Boolean(value));

  return {
    check: {
      type: "show",
      title: candidate.title,
      year: candidate.year,
      traktId: candidate.traktId,
      watched: plays > 0,
      plays,
      lastWatchedAt: timestamps[0],
      firstWatchedAt: plays <= events.length ? timestamps[timestamps.length - 1] : undefined,
    },
    events,
  };
}

async function checkCandidate(candidate: Candidate): Promise<{ check: WatchCheck; events: CompactHistoryItem[] }> {
  const result = await probeCandidate(candidate);
  if (!result) {
    throw new Error(`Requested media or resource was not found on Trakt.`);
  }
  return result;
}

function sortNewestFirst(items: CompactHistoryItem[]): CompactHistoryItem[] {
  return items.sort((a, b) => {
    const timeA = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
    const timeB = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Check whether (and when) a movie or show was watched, or browse your recent Trakt watch history.
 * Title lookups scan the COMPLETE history for the resolved item, never just the recent entries,
 * so "not watched" answers are reliable.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", query, year, traktId, page = 1, limit = 20 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  // Lookup mode: exhaustive per-item history check
  if (query || traktId !== undefined) {
    if (query && traktId === undefined && !isMatchableTitle(query)) {
      return {
        mode: "lookup",
        exhaustive: false,
        found: false,
        message:
          `The title ${JSON.stringify(query)} cannot be compared: after normalization it has no letters or digits. ` +
          `This is NOT a definitive not-watched answer.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    let candidates: Candidate[] = [];
    let missedYears: number[] = [];
    let unchecked: Candidate[] = [];
    let truncated = false;
    let exactTruncated = false;
    let titleExists = false;
    let approximated = false;
    let yearHeldBy: Candidate[] = [];

    let prechecked: { check: WatchCheck; events: CompactHistoryItem[] }[] | undefined;

    if (traktId !== undefined) {
      const movieCandidate: Candidate = {
        type: "movie",
        traktId,
        title: query ?? `Movie ${traktId}`,
        year,
      };
      const showCandidate: Candidate = {
        type: "show",
        traktId,
        title: query ?? `Show ${traktId}`,
        year,
      };

      const refuseId = (message: string): Output => ({
        mode: "lookup",
        exhaustive: false,
        found: false,
        message,
        checked: [],
        history: [],
        hasMore: false,
      });

      if (type === "movies") {
        const movie = await probeCandidate(movieCandidate);
        if (movie) {
          prechecked = [movie];
        } else {
          const show = await probeCandidate(showCandidate);
          if (show) {
            return refuseId(
              `Trakt ID ${traktId} is a show, not a movie. Call again with \`type: "shows"\`. ` +
                `Do not report a watched or not-watched verdict from this call.`,
            );
          }
        }
      } else if (type === "shows") {
        const show = await probeCandidate(showCandidate);
        if (show) {
          prechecked = [show];
        } else {
          const movie = await probeCandidate(movieCandidate);
          if (movie) {
            return refuseId(
              `Trakt ID ${traktId} is a movie, not a show. Call again with \`type: "movies"\`. ` +
                `Do not report a watched or not-watched verdict from this call.`,
            );
          }
        }
      } else {
        const [movie, show] = await Promise.all([probeCandidate(movieCandidate), probeCandidate(showCandidate)]);
        if (movie && show) {
          return refuseId(
            `Trakt ID ${traktId} is used by both a movie and a show; those namespaces are not interchangeable. ` +
              `Pass \`type: "movies"\` or \`type: "shows"\` (from \`search-movies\` / \`search-shows\`) instead of ` +
              `reporting a watched or not-watched verdict.`,
          );
        }
        if (movie) prechecked = [movie];
        else if (show) prechecked = [show];
      }
    } else if (query) {
      const selection = await resolveCandidates(query, year, type);
      candidates = selection.candidates;
      missedYears = selection.missedYears;
      unchecked = selection.unchecked;
      truncated = selection.truncated;
      exactTruncated = selection.exactTruncated;
      titleExists = selection.titleExists;
      approximated = selection.approximated;
      yearHeldBy = selection.yearHeldBy;
    }

    const lookup = resolveLookupQuery(query, year);
    const target = query ? `"${query}"` : `Trakt ID ${traktId}`;

    if (!prechecked && candidates.length === 0 && yearHeldBy.length > 0) {
      const held = yearHeldBy.map((item) => `"${item.title}"${item.year ? ` (${item.year})` : ""}`).join(", ");
      return {
        mode: "lookup",
        exhaustive: false,
        found: false,
        message:
          `${target} has a ${lookup.year} release, but it is titled ${held}. ` +
          `Ask the user whether they mean that title. Do not report a watched or not-watched ` +
          `verdict for ${target}, because that exact title was not checked.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    if (!prechecked && candidates.length === 0 && lookup.year !== undefined && titleExists) {
      const knownYears = missedYears.length > 0 ? ` Known year(s) for that title: ${missedYears.join(", ")}.` : "";
      return {
        mode: "lookup",
        exhaustive: false,
        found: false,
        message:
          `${
            truncated
              ? `No ${lookup.year} release of ${target} is reachable: that title has more releases than Trakt's search can return, so this is not proof that none exists.`
              : `${target} has no ${lookup.year} release on Trakt.`
          }${knownYears} ` +
          `Ask the user which release they mean, or call again without a year. Do not report a watched or ` +
          `not-watched verdict, because none of the releases above was checked.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    if (!prechecked && candidates.length === 0) {
      return {
        mode: "lookup",
        exhaustive: true,
        found: false,
        wasWatched: false,
        message: `${target} could not be found on Trakt, so it cannot be in your watch history.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    const results = prechecked ?? (await Promise.all(candidates.map(checkCandidate)));

    const checked = results.map((result) => result.check);
    const events = sortNewestFirst(results.flatMap((result) => result.events));
    const watchedItems = checked.filter((item) => item.watched);
    const wasWatched = watchedItems.length > 0;

    const label = (item: WatchCheck) => `"${item.title}"${item.year ? ` (${item.year})` : ""}`;
    const checkedLabels = checked.map(label).join(", ");
    const hasUnchecked = unchecked.length > 0;
    const uncheckedYearList = uniqueYears(unchecked);
    const uncheckedLabels =
      uncheckedYearList.length > 0 ? uncheckedYearList.join(", ") : `${unchecked.length} with no year on Trakt`;

    // A positive verdict rests on a real watch event, so releases left out cannot invalidate it.
    // A negative one is only exhaustive once every release sharing the title has been probed,
    // which also requires the search to have enumerated them all in the first place.
    const exhaustive = wasWatched || (!hasUnchecked && !exactTruncated && !approximated);

    let message: string;
    if (wasWatched) {
      const confirmed = watchedItems
        .map(
          (item) =>
            `${label(item)} was watched: ${item.plays} recorded play(s)${
              item.lastWatchedAt ? `, most recently on ${item.lastWatchedAt}` : ""
            }.`,
        )
        .join(" ");
      message =
        hasUnchecked || approximated || (exactTruncated && year === undefined)
          ? `${confirmed} Other releases share that title and were not checked` +
            `${hasUnchecked ? ` (${uncheckedLabels})` : ""}, so name the release this answer refers to.`
          : confirmed;
    } else if (approximated) {
      message =
        `No watch event exists among the closest matches for ${target} (${checkedLabels || "none"}), ` +
        `but none is titled exactly ${target}. This is NOT a definitive not-watched answer.`;
    } else if (hasUnchecked) {
      message =
        `No watch event exists for ${target} among the releases checked (${checkedLabels}), but other releases ` +
        `share that exact title and were NOT checked: ${uncheckedLabels}. Ask the user which release ` +
        `they mean instead of reporting a not-watched verdict.`;
    } else if (exactTruncated) {
      message =
        `No watch event exists for ${target} among the releases checked (${checkedLabels}), but that title has ` +
        `more identically named releases than Trakt's exact search can return, so some were never seen. ` +
        `This is NOT a definitive not-watched answer. ` +
        (lookup.year !== undefined
          ? `The year is already set: resolve the release with \`search-movies\` / \`search-shows\` and call again with its \`traktId\` and \`type\`.`
          : `Ask the user which release they mean, or pass its \`year\`.`);
    } else {
      message =
        `Confirmed: no watch event exists for ${target} (checked the complete history of ${checkedLabels}). ` +
        `This result is exhaustive, do not assume otherwise.`;
    }

    return {
      mode: "lookup",
      exhaustive,
      found: true,
      wasWatched,
      message,
      checked,
      history: events.slice(0, safeLimit),
      hasMore: false,
    };
  }

  // Browse mode: most recent history entries only
  const allItems: CompactHistoryItem[] = [];
  let hasMore = false;

  if (type === "movies") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.movies.getMovieHistory({
          query: { page, limit: safeLimit, extended: "full" },
          fetchOptions: { signal },
        }),
      "Failed to fetch movie history",
    );
    const paginated = withPagination(res);
    allItems.push(...paginated.data.map(toCompactMovieHistory));
    hasMore = page < paginated.pagination["x-pagination-page-count"];
  } else if (type === "shows") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.shows.getShowHistory({
          query: { page, limit: safeLimit, extended: "full" },
          fetchOptions: { signal },
        }),
      "Failed to fetch show history",
    );
    const paginated = withPagination(res);
    allItems.push(...paginated.data.map(toCompactShowHistory));
    hasMore = page < paginated.pagination["x-pagination-page-count"];
  } else {
    const [moviesRes, showsRes] = await Promise.all([
      executeToolCall(
        (signal) =>
          toolTraktClient.movies.getMovieHistory({
            query: { page, limit: safeLimit, extended: "full" },
            fetchOptions: { signal },
          }),
        "Failed to fetch movie history",
      ),
      executeToolCall(
        (signal) =>
          toolTraktClient.shows.getShowHistory({
            query: { page, limit: safeLimit, extended: "full" },
            fetchOptions: { signal },
          }),
        "Failed to fetch show history",
      ),
    ]);

    const paginatedMovies = withPagination(moviesRes);
    const paginatedShows = withPagination(showsRes);

    allItems.push(...paginatedMovies.data.map(toCompactMovieHistory), ...paginatedShows.data.map(toCompactShowHistory));
    sortNewestFirst(allItems);

    hasMore =
      page < paginatedMovies.pagination["x-pagination-page-count"] ||
      page < paginatedShows.pagination["x-pagination-page-count"];
  }

  return {
    mode: "browse",
    exhaustive: false,
    message:
      "These are only the most recent history entries. Never conclude that a title was not watched from this list; use the `query` parameter for a definitive check.",
    history: allItems.slice(0, safeLimit),
    page,
    hasMore,
  };
}
