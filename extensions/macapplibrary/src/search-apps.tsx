import { useState } from "react";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AppSummary, MacAppLibraryNotRunningError, listApps } from "./lib/api";
import { AppItem } from "./components/AppItem";
import { NotRunningView } from "./components/NotRunningView";

export default function SearchApps() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    listApps,
    [],
    { keepPreviousData: true },
  );
  const [query, setQuery] = useState("");

  if (error instanceof MacAppLibraryNotRunningError) {
    return <NotRunningView onRetry={revalidate} />;
  }

  const filtered = filterApps(data ?? [], query);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search by name, developer, category, or description"
    >
      {filtered.map((app) => (
        <AppItem key={app.bundleID} app={app} onChanged={revalidate} />
      ))}
    </List>
  );
}

function filterApps(apps: AppSummary[], query: string): AppSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  const terms = q.split(/\s+/);
  return apps.filter((app) => {
    const haystack = [
      app.name,
      app.developer ?? "",
      app.bundleID,
      app.description ?? "",
      ...(app.categories ?? []),
      app.systemCategory ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
