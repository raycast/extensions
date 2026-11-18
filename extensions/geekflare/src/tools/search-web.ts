import { callGeekflare, toSearchResults } from "../geekflare";

type Input = {
  /**
   * The search query.
   */
  query: string;
  /**
   * Return the full Google results page (organic results, AI Overview, People Also Ask).
   */
  serp?: boolean;
  /**
   * Search source: web (default), news, or images.
   */
  source?: "web" | "news" | "images";
  /**
   * Number of results to return, 1-20.
   */
  limit?: number;
  /**
   * Country code (ISO alpha-2) for localized results, for example "us" or "de".
   */
  location?: string;
  /**
   * City for localized results, for example "London,England,United Kingdom".
   */
  city?: string;
};

/**
 * @returns Search results with title, URL, and snippet. With serp, also People Also Ask and AI Overview when present.
 */
export default async function (input: Input) {
  const payload = await callGeekflare("search", {
    query: input.query,
    serp: input.serp,
    source: input.source,
    limit: Math.min(Math.max(input.limit ?? 8, 1), 20),
    location: input.location,
    city: input.city,
  });
  const results = toSearchResults(payload);
  if (!input.serp) return results;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  return { results, people_also_ask: data.people_also_ask, ai_overview: data.ai_overview };
}
