export const RESULTS_TABS = ["top", "latest", "people", "media", "lists"] as const;

export type ResultsTab = (typeof RESULTS_TABS)[number];

export type PreferredTab = Extract<ResultsTab, "top" | "latest">;

export const RESULTS_TAB_TITLES: Record<ResultsTab, string> = {
  top: "Top",
  latest: "Latest",
  people: "People",
  media: "Media",
  lists: "Lists",
};

const RESULTS_TAB_LINK_VALUES: Record<ResultsTab, string> = {
  top: "top",
  latest: "live",
  people: "user",
  media: "media",
  lists: "list",
};

export function parsePreferredTab(preference: string | undefined): PreferredTab {
  return preference === "latest" ? "latest" : "top";
}

export function buildSearchLink(query: string, resultsTab: ResultsTab): string | null {
  if (query === "") return null;
  const url = new URL("https://x.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("src", "typed_query");
  url.searchParams.set("f", RESULTS_TAB_LINK_VALUES[resultsTab]);
  return url.toString();
}
