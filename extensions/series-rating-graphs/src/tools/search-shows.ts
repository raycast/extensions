import { getApiBaseUrl } from "../utils/api";
import { SearchResult } from "../types";

type Input = {
  /**
   * The show's title
   */
  title: string;
};

/**
 * Search for TV shows
 */
export default async function SearchShows(input: Input) {
  const apiBaseUrl = getApiBaseUrl();

  const res = await fetch(`${apiBaseUrl}/search/titles?query=${encodeURIComponent(input.title)}`);

  if (!res.ok) {
    throw new Error("Failed to search shows");
  }

  const data = (await res.json()) as { titles?: SearchResult[] };
  const shows = (data.titles ?? []).filter((item) => item.type === "tvSeries");

  const result = shows.map((show) => ({
    id: show.id,
    title: show.primaryTitle,
    originalTitle: show.originalTitle ?? null,
    startYear: show.startYear ?? null,
    endYear: show.endYear ?? "now",
    rating: {
      aggregateRating: show?.rating?.aggregateRating ?? null,
      voteCount: show?.rating?.voteCount ?? null,
    },
  }));

  return { result };
}
