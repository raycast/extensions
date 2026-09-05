import {
  getPreferences,
  getMaxResults,
  getMaxContentLength,
} from "../lib/preferences";
import { research } from "../lib/research-agent";

/**
 * Searches the web for information using local search engines and Ollama AI.
 * Returns a grounded answer with cited sources based on real web content.
 *
 * @param input - The search parameters
 * @param input.query - The search query to look up on the web
 * @returns A detailed answer with sources from the web
 */
export default async function tool(input: { query: string }): Promise<string> {
  const query = input.query.trim();

  if (query.length === 0) {
    return "Error: Please provide a search query.";
  }

  const prefs = getPreferences();

  const context = await research(query, {
    searxngUrl: prefs.searxngUrl,
    maxResults: getMaxResults(prefs),
    maxContentLength: getMaxContentLength(prefs),
  });

  if (context.sources.length === 0) {
    return "No web results found for this query. Try rephrasing your search.";
  }

  // Return raw scraped data directly so Raycast AI has maximum context
  const sourcesText = context.sources
    .map((s, i) => `[Source ${i + 1}] ${s.title}\nURL: ${s.url}`)
    .join("\n\n");

  return `Here is the raw context from the web:\n\n${context.contextText}\n\n---\nSources used:\n${sourcesText}`;
}
