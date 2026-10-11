import { DocumentType, search } from "../api";
import { snippetText } from "../lib/text";

type Input = {
  /**
   * A Hister query. Plain words match page titles, text, URLs and domains. Also supported: "exact phrases"; field filters title:word, text:word, domain:github.com, url:*docs*, label:name, type:web or type:file; visits:5.. for pages visited at least five times; updated:<7d or updated:>=2026-04-01 for when the user last visited, added:<30d for when it was first indexed; a leading minus to exclude (-domain:reddit.com); alternatives in parentheses (domain:(a.com|b.com)); and sort:date (newest first), sort:-date or sort:visits. Use the user's own words, and add a filter only when they name a site, a time range or a kind of document.
   */
  query: string;
  /**
   * How many pages to return, from 1 to 25. Defaults to 10.
   */
  limit?: number;
};

function isoDate(seconds?: number): string | undefined {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

/**
 * Search the user's Hister index: the full text of web pages they have visited and files they keep. Results come best match first, each with a snippet of the text that matched. Use read-page for what a page actually says.
 */
export default async function tool({ query, limit = 10 }: Input) {
  const results = await search(query.trim(), { limit: Math.min(Math.max(Math.round(limit), 1), 25) });
  const history = results.history.map((entry) => ({
    title: entry.title,
    url: entry.url,
    openedFromThisSearch: entry.count,
    pinned: entry.pinned,
  }));
  const historyUrls = new Set(history.map((entry) => entry.url));
  const pages = results.documents
    .filter((document) => !historyUrls.has(document.url))
    .map((document) => ({
      title: document.title,
      url: document.url,
      domain: document.domain || undefined,
      kind: document.type === DocumentType.Web ? "web page" : "file",
      lastVisited: isoDate(document.updated),
      firstIndexed: isoDate(document.added),
      visits: document.add_count || undefined,
      label: document.label || undefined,
      snippet: document.text ? snippetText(document.text) : undefined,
    }));

  return {
    totalMatches: results.total,
    ...(history.length ? { previouslyOpenedForThisQuery: history } : {}),
    pages,
    ...(results.suggestion ? { didYouMean: results.suggestion } : {}),
  };
}
