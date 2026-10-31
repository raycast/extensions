import { searchHistory } from "../data";

type Input = {
  /** Words to look for in titles, addresses and the text of the pages. Empty lists the most recent. */
  query: string;
  /** Only pages visited in the last this many days. */
  days?: number;
  /** Only pages from this site, a host like "github.com". */
  site?: string;
};

/** Pages the user visited in Yab, newest first, with a passage of the page's text where the words matched. */
export default async function tool(input: Input) {
  const since = input.days ? Date.now() / 1000 - input.days * 86400 : undefined;
  const pages = await searchHistory(input.query ?? "", { since, host: input.site, limit: 25 });
  return pages.map((p) => ({
    title: p.title,
    url: p.url,
    lastVisit: new Date(p.last * 1000).toISOString(),
    visits: p.count,
    passage: p.passage?.replace(/[⟦⟧]/g, ""),
    whatTheyWereDoing: p.thread,
  }));
}
