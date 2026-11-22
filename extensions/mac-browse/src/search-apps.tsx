import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { AppItem } from "./app-item";
import { ErrorView } from "./error-view";
import { HEADERS, SITE, SearchResponse } from "./api";

export default function SearchApps() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, revalidate } = useFetch<SearchResponse>(
    `${SITE}/api/search?q=${encodeURIComponent(query.trim())}`,
    {
      headers: HEADERS,
      keepPreviousData: true,
    },
  );

  const typed = query.trim().length > 0;
  const featured = data?.featured ?? [];
  // The site puts featured apps first in results too, so skip them below the featured row.
  const shown = new Set(featured.map((app) => app.id));
  const results = (typed ? data?.items : data?.latest)?.filter((app) => !shown.has(app.id)) ?? [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Mac apps on Mac Browse…"
      throttle
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No apps found" description="Try another word, such as notes, clipboard or AI." />
      )}
      <List.Section title="Featured">
        {featured.map((app) => (
          <AppItem key={app.id} app={app} />
        ))}
      </List.Section>
      <List.Section title={typed ? "Results" : "Newly Added"}>
        {results.map((app) => (
          <AppItem key={app.id} app={app} />
        ))}
      </List.Section>
    </List>
  );
}
