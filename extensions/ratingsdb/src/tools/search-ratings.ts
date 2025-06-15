import { searchTitles } from "../utils/requests";
import { showFailureToast } from "@raycast/utils";
import { Media } from "../types";

type Input = {
  /**
   * The search query for movies or TV shows.
   */
  query: string;
  /**
   * The type of media to search for. Defaults to all types.
   */
  type?: "movie" | "series" | "all";
  /**
   * The maximum number of results to return. Defaults to 10.
   */
  limit?: number;
};

/**
 * Search for movies and TV shows by title and return ratings and details.
 *
 * Some examples:
 * - search for inception -> { query: "inception" }
 * - find stranger things -> { query: "stranger things", type: "series" }
 * - show top 5 batman movies -> { query: "batman", type: "movie", limit: 5 }
 * - find recent sci-fi shows -> { query: "sci-fi", type: "series" }
 */
export default async function ({ query, type = "all", limit = 10 }: Input) {
  try {
    const results = await searchTitles(query, type);

    return results.Search?.slice(0, limit).map((item: Media) => ({
      id: item.imdbID,
      title: item.Title,
      year: item.Year,
      type: item.Type,
      poster: item.Poster !== "N/A" ? item.Poster : undefined,
    }));
  } catch (error) {
    showFailureToast(error, { title: "Failed to search for media" });
    throw new Error(`Failed to search for "${query}": ${error}`);
  }
}
