import { createClient, type Client } from "../api/client";
import { readIndex, writeIndex } from "../index/cache";
import { loadIndex, type SearchIndex } from "../index/loadIndex";
import { getConfig, getWebBaseUrl } from "../preferences";

export type ToolContext = {
  client: Client;
  index: SearchIndex;
  web: string;
};

/**
 * Shared entry point for every tool. Uses the cached index when present — tools run outside a React
 * component, so the useSearchIndex hook is unavailable here.
 */
export async function getToolContext(): Promise<ToolContext> {
  const client = createClient(getConfig());

  let index = readIndex();
  if (index === null) {
    index = await loadIndex(client);
    writeIndex(index);
  }

  return { client, index, web: getWebBaseUrl() };
}
