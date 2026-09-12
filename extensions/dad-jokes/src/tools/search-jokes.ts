import { searchJokes } from "../api";

type Input = {
  /**
   * The topic or keyword to search for, e.g. "cat", "programming", or "food"
   */
  term: string;
  /**
   * Maximum number of jokes to return (default 3, max 10)
   */
  limit?: number;
};

/**
 * Search for dad jokes matching a topic or keyword
 */
export default async function tool(input: Input) {
  const limit = Math.min(Math.max(input.limit ?? 3, 1), 10);
  const jokes = await searchJokes(input.term, limit);

  return jokes.map((joke) => joke.joke);
}
