import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { MaterialMatch, searchNotes } from "./lib/api";
import { MaterialDetail } from "./lib/views";

export default function SearchNotes() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = usePromise(
    async (q: string) => (q.trim().length === 0 ? [] : await searchNotes(q.trim())),
    [query],
  );
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search a note or material, like oud or vetiver"
    >
      {error ? (
        <List.EmptyView title="Search failed" description={error.message} icon={Icon.Warning} />
      ) : query.trim().length > 0 && isLoading ? null : (
        <List.EmptyView
          title={query.trim().length === 0 ? "Search Perfume Notes" : "No notes found"}
          description={
            query.trim().length === 0 ? "See what a note smells like and which perfumes showcase it." : undefined
          }
          icon={Icon.MagnifyingGlass}
        />
      )}
      {(data as MaterialMatch[] | undefined)?.map((m) => (
        <List.Item
          key={m.name}
          title={m.name}
          accessories={m.family ? [{ tag: m.family }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Note Details"
                icon={Icon.Eye}
                target={<MaterialDetail name={m.name} fallbackUrl={m.page} />}
              />
              <Action.OpenInBrowser title="Open on Scento" url={m.page} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
