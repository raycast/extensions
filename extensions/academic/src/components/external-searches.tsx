import { Action, ActionPanel, Icon, List } from "@raycast/api";

const SEARCHES: Array<{
  id: string;
  title: string;
  url: (query: string) => string;
}> = [
  {
    id: "google-scholar-external",
    title: "Google Scholar",
    url: (query) =>
      `https://scholar.google.com/scholar?${new URLSearchParams({ q: query })}`,
  },
  {
    id: "philpapers-external",
    title: "PhilPapers",
    url: (query) => `https://philpapers.org/s/${encodeURIComponent(query)}`,
  },
  {
    id: "ssrn-external",
    title: "SSRN",
    url: (query) =>
      `https://papers.ssrn.com/sol3/results.cfm?${new URLSearchParams({ txtKey_Words: query })}`,
  },
  {
    id: "repec-external",
    title: "RePEc / IDEAS",
    url: (query) =>
      `https://ideas.repec.org/cgi-bin/htsearch?${new URLSearchParams({ q: query })}`,
  },
  {
    id: "doab-external",
    title: "Directory of Open Access Books",
    url: (query) =>
      `https://directory.doabooks.org/discover?${new URLSearchParams({ query })}`,
  },
  {
    id: "oapen-external",
    title: "OAPEN Library",
    url: (query) =>
      `https://library.oapen.org/discover?${new URLSearchParams({ query })}`,
  },
  {
    id: "hathitrust-external",
    title: "HathiTrust",
    url: (query) =>
      `https://catalog.hathitrust.org/Search/SearchExport?${new URLSearchParams({ lookfor: query, style: "json" })}`,
  },
  {
    id: "worldcat-external",
    title: "WorldCat",
    url: (query) =>
      `https://search.worldcat.org/search?${new URLSearchParams({ q: query })}`,
  },
];

export function ExternalSearches({
  query,
  enabledSourceIds,
}: {
  query: string;
  enabledSourceIds: string[];
}) {
  const rows = SEARCHES.filter((source) =>
    enabledSourceIds.includes(source.id),
  );
  if (!query.trim() || !rows.length) return null;
  return (
    <List.Section
      title="External Catalog Searches"
      subtitle="Opened in your browser; no automated scraping"
    >
      {rows.map((source) => (
        <List.Item
          key={source.id}
          title={`Search ${source.title}`}
          subtitle={query}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`Search ${source.title}`}
                url={source.url(query.trim())}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
