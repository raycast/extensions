import { runTool } from "../tools";
import { toolContext, prefs } from "../calypso";

type Input = {
  /** What to search for. A natural-language question works fine. */
  query: string;
};

/**
 * Exposes the self-hosted SearXNG instance to Raycast AI.
 *
 * Raycast's own web search goes out through Raycast's infrastructure; this one
 * goes through the SearXNG on TrueNAS, which is unmetered and sees the same
 * tailnet the rest of the stack lives on.
 */
export default async function searchWeb(input: Input): Promise<string> {
  return runTool("web_search", JSON.stringify({ query: input.query }), toolContext(prefs()));
}
