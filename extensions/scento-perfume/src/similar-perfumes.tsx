import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { PerfumeMatch, searchPerfumes } from "./lib/api";
import { SimilarPerfumes } from "./lib/views";

export default function FindSimilarPerfumes() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = usePromise(
    async (q: string) => (q.trim().length === 0 ? [] : (await searchPerfumes(q.trim())).items),
    [query],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Name a perfume you like">
      {error ? (
        <List.EmptyView title="Search failed" description={error.message} icon={Icon.Warning} />
      ) : query.trim().length > 0 && isLoading ? null : (
        <List.EmptyView
          title={query.trim().length === 0 ? "Find Similar Perfumes" : "No perfumes found"}
          description={
            query.trim().length === 0 ? "Type a perfume name, then pick it to see what smells alike." : undefined
          }
          icon={Icon.MagnifyingGlass}
        />
      )}
      {(data as PerfumeMatch[] | undefined)?.map((p) => (
        <List.Item
          key={`${p.name}-${p.house}`}
          title={p.name}
          subtitle={p.house}
          accessories={p.family ? [{ tag: p.family }] : []}
          actions={
            <ActionPanel>
              <Action.Push title="Show Similar Perfumes" icon={Icon.List} target={<SimilarPerfumes perfume={p} />} />
              <Action.OpenInBrowser title="Open on Scento" url={p.page} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
