import { runTool } from "../tools";
import { toolContext, prefs } from "../calypso";

type Input = {
  /** Absolute URL of the page to fetch. */
  url: string;
};

/** Fetches a page as markdown through the self-hosted Firecrawl. */
export default async function fetchPage(input: Input): Promise<string> {
  return runTool("fetch_url", JSON.stringify({ url: input.url }), toolContext(prefs()));
}
