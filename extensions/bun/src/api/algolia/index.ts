import algoliasearch from "algoliasearch";

import { bunDocsAlgoliaApiKey, bunDocsAlgoliaAppId } from "./constants";

const client = algoliasearch(bunDocsAlgoliaAppId, bunDocsAlgoliaApiKey);
const index = client.initIndex("bun");

type Level = `lvl${number}`;
export const searchBunDocs = index.search<{
  url?: string;
  url_without_anchor?: string;
  anchor?: string;
  content?: string | null;
  type?: "content" | Level;
  hierarchy?: Record<Level, string | null>;
}>;
export type BunDocsSearchResult = Awaited<ReturnType<typeof searchBunDocs>>["hits"][number];
