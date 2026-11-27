import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_BASE, authHeaders, GscRows, parseResponse } from "./api";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Shared list for Search Pages and Search Keywords: top 100 rows over 28 days, filtered locally by the search bar. */
export function GscList({ kind }: { kind: "pages" | "queries" }) {
  const { data, isLoading } = useFetch<GscRows>(`${API_BASE}/gsc/top-${kind}?days=28&limit=100`, {
    headers: authHeaders(),
    parseResponse,
    failureToastOptions: { title: "Could not load Search Console data" },
  });
  const label = kind === "pages" ? "pages" : "keywords";

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search your top ${label}`}>
      <List.EmptyView title={`No ${label} yet`} description="Search Console has no rows for this window." />
      <List.Section
        title={data?.site ?? "Search Console"}
        subtitle={data ? `Top ${data.rows.length} ${label}, last ${data.window_days ?? 28} days` : undefined}
      >
        {data?.rows.map((row) => {
          const name = (kind === "pages" ? row.page : row.query) ?? "";
          return (
            <List.Item
              key={name}
              title={name}
              accessories={[
                { text: `${row.clicks} clicks`, tooltip: "Clicks" },
                { text: `${row.impressions} impr.`, tooltip: "Impressions" },
                { text: pct(row.ctr), tooltip: "CTR" },
                { text: `pos ${row.position.toFixed(1)}`, tooltip: "Average position" },
              ]}
              actions={
                <ActionPanel>
                  {kind === "pages" ? (
                    <Action.OpenInBrowser url={name} />
                  ) : (
                    <Action.OpenInBrowser
                      title="Search on Google"
                      url={`https://www.google.com/search?q=${encodeURIComponent(name)}`}
                    />
                  )}
                  <Action.CopyToClipboard content={name} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
