import { TraktMovieListItem } from "../lib/schema";
import { createSearchTool, toolTraktClient } from "./search-tool";

type Input = {
  /**
   * The title of the movie to search for in the Trakt database.
   * This should be a non-empty string containing the full or partial movie title.
   * The search is case-insensitive and will match partial titles.
   * Supports partial matching and will return similar results.
   * Example: "inception" will match "Inception", "The Inception", etc.
   */
  title: string;
  /**
   * The page number for paginated results.
   * Must be a positive integer starting from 1.
   * Each page returns exactly 10 movie results.
   * Use this parameter for implementing infinite scroll or pagination.
   * Example: page 1 returns results 1-10, page 2 returns 11-20, etc.
   */
  page: number;
};

/**
 * Search for movies in the Trakt database.
 * Use this tool when:
 * - You need to find movies by their title
 * - You need to search through the Trakt movie database
 * - You want to get detailed movie information including ratings and metadata
 *
 * The tool returns paginated results with 10 movies per page.
 * Each movie result includes full metadata like year, runtime, genres, and ratings.
 *
 * Input:
 * title: The movie title to search for (e.g., "inception", "the matrix")
 * page: Page number starting from 1, returns 10 results per page
 *
 * Output:
 * data: List of movies with title, year, overview, rating, genres
 * hasMore: True if more pages are available
 */
const tool = createSearchTool<TraktMovieListItem, Input>(toolTraktClient.movies.searchMovies);

export default tool;
