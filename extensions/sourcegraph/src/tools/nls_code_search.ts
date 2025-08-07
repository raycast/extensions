import { sourcegraphInstance } from "../sourcegraph";
import { executeNLSSearch, formatSearchResults } from "./shared/search";

type Input = {
  /**
   * Natural language search query. Describe what you're looking for in plain English, e.g., "functions that handle user authentication" or "React components for displaying lists".
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  maxResults?: number;
};

/**
 * Search for code using natural language processing in your private Sourcegraph instance.
 * This tool understands natural language queries and is optimized for AI-driven searches.
 * Use when you want to describe functionality or concepts rather than exact code matches.
 */
export default async function tool(params: Input) {
  const { query, maxResults = 40 } = params;

  const src = sourcegraphInstance();
  if (!src) {
    throw new Error(
      "No custom Sourcegraph instance configured - ask the user to configure a Sourcegraph instance in preferences, or use the 'public_' equivalent of this tool.",
    );
  }

  // Perform the NLS search
  const results = await executeNLSSearch(src, query, maxResults);

  // Format results for AI consumption
  return formatSearchResults(results, src);
}
