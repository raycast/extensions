import { CompactRatingItem } from "./compact-media";
import { partitionByLookup } from "./title-text";

export type RatingMatchPick = {
  exact: CompactRatingItem[];
  related: CompactRatingItem[];
  yearHeldBy: CompactRatingItem[];
  yearUnknown: CompactRatingItem[];
  scoreMismatched: CompactRatingItem[];
};

/**
 * Split scanned ratings the same way history splits releases: a score or year filter
 * must not turn "rated as 8" or "rated the 2021 film" into a confirmed never-rated.
 */
export function pickRatingMatches(
  items: CompactRatingItem[],
  query: string | undefined,
  traktId: number | undefined,
  year?: number,
  rating?: number,
): RatingMatchPick {
  const {
    exact: yearExact,
    related,
    yearHeldBy,
    yearUnknown,
  } = partitionByLookup(
    items,
    (item) => [item.title, item.episode?.title],
    (item) => item.traktId,
    (item) => item.year,
    query,
    traktId,
    year,
  );

  if (rating === undefined) {
    return { exact: yearExact, related, yearHeldBy, yearUnknown, scoreMismatched: [] };
  }

  return {
    exact: yearExact.filter((item) => item.rating === rating),
    related,
    yearHeldBy,
    yearUnknown,
    scoreMismatched: yearExact.filter((item) => item.rating !== rating),
  };
}

export function describeRatingScope(type: string): string {
  if (type === "all") return "every rating";
  if (type === "movies") return "every movie rating";
  if (type === "shows") return "every show rating";
  if (type === "seasons") return "every season rating";
  if (type === "episodes") return "every episode rating";
  return "every rating";
}
