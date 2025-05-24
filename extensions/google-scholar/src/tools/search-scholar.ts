import axios from "axios";
import { SearchParams, SearchResult, constructSearchUrl } from "../search-articles"; // Path to access exported items
import { getRandomUserAgent } from "../utils/userAgents";
import { parseScholarHtmlResults } from "../utils/parser";
import { Cache } from "../utils/cache"; // AI tools can also leverage caching

/**
 * Searches Google Scholar for articles based on the provided parameters.
 * It fetches search results, parses them, and returns a list of articles.
 * Use this tool to find academic papers, authors, and publications.
 */
export default async function searchScholar(params: SearchParams): Promise<SearchResult[]> {
  // AI tool should ideally not show toasts directly unless it's a final user-facing message.
  // For now, we'll keep it simpler and avoid direct UI interactions from the tool.

  const url = constructSearchUrl(params, 0); // AI tool will initially fetch the first page

  // Optional: AI tool can also check cache first
  const cachedResults = Cache.get(url) as SearchResult[] | undefined;
  if (cachedResults && Array.isArray(cachedResults)) {
    console.log("AI Tool: Loaded from cache", url);
    return cachedResults;
  }

  try {
    console.log("AI Tool: Fetching URL", url);
    const response = await axios.get(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
      // Consider a timeout for AI tool requests
      timeout: 10000, // 10 seconds timeout for example
    });

    const html = response.data;

    if (html.includes("sorry") || html.includes("CAPTCHA")) {
      console.error("AI Tool: Blocked by Google Scholar", url);
      // AI tools should return errors or specific statuses rather than throwing generic errors if possible,
      // or the AI orchestrator should handle them. For now, an empty array indicates failure/block.
      // Or, we can throw a specific error that the AI might understand or that can be handled upstream.
      throw new Error("Google Scholar access blocked (CAPTCHA or other issue).");
    }

    const results = parseScholarHtmlResults(html);

    // Cache the results fetched by the AI tool
    Cache.set(url, results);

    console.log(`AI Tool: Found ${results.length} results for`, params);
    return results;
  } catch (error) {
    console.error("AI Tool: Error fetching or parsing Google Scholar results:", error);
    // Depending on Raycast AI's error handling, we might throw the error,
    // or return an empty array/specific error object.
    // Throwing allows the AI to potentially see the error message.
    if (error instanceof Error) {
      throw error; // Re-throw the original error
    }
    throw new Error("Failed to fetch or parse Google Scholar results.");
  }
}
