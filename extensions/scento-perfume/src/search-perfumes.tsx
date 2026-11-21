import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { PerfumeMatch, searchPerfumes } from "./lib/api";
import { PerfumeDetail, SimilarPerfumes } from "./lib/views";

export default function SearchPerfumes() {
  const [query, setQuery] = useState("");
  const { data, isLoading, pagination, error } = usePromise(
    (q: string) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        if (q.trim().length === 0) return { data: [], hasMore: false };
        const res = await searchPerfumes(q.trim(), cursor);
        return { data: res.items, hasMore: res.cursor !== null, cursor: res.cursor ?? undefined };
      },
    [query],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      pagination={pagination}
      searchBarPlaceholder="Search by perfume, house, note or mood"
    >
      {error ? (
        <List.EmptyView title="Search failed" description={error.message} icon={Icon.Warning} />
      ) : query.trim().length === 0 ? (
        <List.EmptyView
          title="Search Scento Perfumes"
          description="Try “santal”, “Tom Ford” or “smoky vanilla”."
          icon={Icon.MagnifyingGlass}
        />
      ) : isLoading ? null : (
        <List.EmptyView
          title="No perfumes found"
          description={`Nothing in Scento's database matches “${query.trim()}”.`}
        />
      )}
      {(data as PerfumeMatch[] | undefined)?.map((p) => (
        <List.Item
          key={`${p.name}-${p.house}`}
          title={p.name}
          subtitle={p.house}
          keywords={p.family ? [p.family] : []}
          accessories={p.family ? [{ tag: p.family }] : []}
          actions={
            <ActionPanel>
              <Action.Push title="Show Notes and Family" icon={Icon.Eye} target={<PerfumeDetail perfume={p} />} />
              <Action.OpenInBrowser title="Open on Scento" url={p.page} shortcut={Keyboard.Shortcut.Common.Open} />
              <Action.Push title="Show Similar Perfumes" icon={Icon.List} target={<SimilarPerfumes perfume={p} />} />
              <Action.CopyToClipboard title="Copy Name" content={`${p.name} by ${p.house}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
