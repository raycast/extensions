import { useCachedState, usePromise } from "@raycast/utils";
import { initTraktClient } from "./client";
import { RatedType, RatingIndex, ratingOf, toRatingIndex, withRating } from "./media-state";
import { scanPageComplete, TraktUserRatingItem, withPagination } from "./schema";

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;
const CACHE_KEY = "trakt-rating-index";

/**
 * Reads the shared ratings. Like the watchlist ids, it is a cached state under one key, so a detail view
 * pushed earlier re-renders with the new score. `ratingOf` is `undefined` both for "not rated" and while the
 * ratings are unknown; `known` tells them apart.
 */
export function useRatingState() {
  const [index, setIndex] = useCachedState<RatingIndex | undefined>(CACHE_KEY);

  return {
    known: index !== undefined,
    ratingOf: (type: RatedType, traktId: number) => (index ? ratingOf(index, type, traktId) : undefined),
    setRating: (type: RatedType, traktId: number, rating: number | undefined) =>
      setIndex((current) => (current ? withRating(current, type, traktId, rating) : current)),
    setIndex,
  };
}

/** Fetches the user's ratings when a command opens and keeps the shared state in step. Call once per command. */
export function useRatingsSync() {
  const traktClient = initTraktClient();
  const { setIndex } = useRatingState();

  const collect = async (type: "movies" | "shows" | "episodes") => {
    const entries: TraktUserRatingItem[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await traktClient.sync.getRatings({ params: { type }, query: { page, limit: PAGE_LIMIT } });
      if (response.status !== 200) throw new Error("Could not read your ratings");

      const { data, pagination } = withPagination(response);
      entries.push(...data);
      if (scanPageComplete(data.length, pagination, PAGE_LIMIT)) return entries;
    }

    // A partial list would show the titles beyond it as unrated: refuse it instead.
    throw new Error("Your ratings are too many to read in full");
  };

  usePromise(
    async () => {
      const [movies, shows, episodes] = await Promise.all([collect("movies"), collect("shows"), collect("episodes")]);
      return toRatingIndex(movies, shows, episodes);
    },
    [],
    {
      onData: setIndex,
      // Without the full list the current score is unknown: Rate stays available, Remove Rating too.
      onError: () => setIndex(undefined),
      failureToastOptions: { title: "Could not read your ratings" },
    },
  );
}
