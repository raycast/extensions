import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { listExpirations } from "./api/endpoints";
import { ExpirationListItem } from "./components/ExpirationListItem";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { track } from "./lib/telemetry";

const MIN_QUERY = 2;

export default function SearchExpirationsCommand() {
  const [searchText, setSearchText] = useState("");
  const query = useDebouncedValue(searchText.trim(), 300);
  const abortable = useRef<AbortController | undefined>(undefined);

  useEffect(() => track({ name: "command_opened", command_name: "search-expirations" }), []);

  const { isLoading, data } = usePromise(
    async (q: string) => {
      const startedAt = Date.now();
      const res = await listExpirations({ term: q, paging: 50, sort: "name", signal: abortable.current?.signal });
      track({
        name: "search_executed",
        command_name: "search-expirations",
        query_length: q.length,
        result_count: res.expiration_items.length,
        latency_ms: Date.now() - startedAt,
      });
      return res.expiration_items;
    },
    [query],
    { execute: query.length >= MIN_QUERY, abortable },
  );

  const items = data ?? [];
  const showHint = query.length > 0 && query.length < MIN_QUERY;

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search expirations by name…"
    >
      {showHint ? (
        <List.EmptyView
          icon="icon.png"
          title="Keep typing…"
          description={`Enter at least ${MIN_QUERY} characters to search.`}
        />
      ) : !isLoading && query.length >= MIN_QUERY && items.length === 0 ? (
        <List.EmptyView icon="icon.png" title="No matches" description={`No expirations match “${query}”.`} />
      ) : (
        items.map((item) => <ExpirationListItem key={item.id} item={item} />)
      )}
    </List>
  );
}
