import { csfd } from "node-csfd-api";

interface MovieResult {
  id: number;
  title: string;
  year?: number;
  colorRating?: string;
  type: "movie" | "tvshow";
  poster?: string;
}

type Input = {
  /**
   * The query to search for movies or TV shows
   */
  query: string;
  /**
   * The type of content to search for (all, movies, tvshows)
   */
  contentType?: "all" | "movies" | "tvshows";
  /**
   * Maximum number of results to return
   */
  limit?: number;
};

/**
 * Search for movies and TV shows on ČSFD (Czech-Slovak Film Database)
 * Returns a list of movies and TV shows that match the query
 */
export default async function tool(input: Input) {
  const { query, contentType = "all", limit = 10 } = input;

  if (!query?.trim()) {
    return { error: "Please provide a search query" };
  }

  try {
    const results = await csfd.search(query);

    let filteredResults: MovieResult[] = [];

    // Filter based on content type
    if (contentType === "all") {
      filteredResults = [
        ...(results.movies || []).map((item) => ({ ...item, type: "movie" as const })),
        ...(results.tvSeries || []).map((item) => ({ ...item, type: "tvshow" as const })),
      ];
    } else if (contentType === "movies") {
      filteredResults = (results.movies || []).map((item) => ({ ...item, type: "movie" as const }));
    } else if (contentType === "tvshows") {
      filteredResults = (results.tvSeries || []).map((item) => ({ ...item, type: "tvshow" as const }));
    }

    // Limit results
    const limitedResults = filteredResults.slice(0, limit);

    return {
      results: limitedResults,
      totalCount: filteredResults.length,
      message: `Found ${filteredResults.length} results for "${query}"`,
    };
  } catch (error) {
    console.error("Error searching ČSFD:", error);
    return {
      error: `Failed to search ČSFD: ${error instanceof Error ? error.message : String(error)}`,
      results: [],
    };
  }
}
