import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { HighlightListItem } from "./HighlightListItem";
import { endpoint, headers, Highlight, Paginated, parseResponse } from "../lib/screvi";

/**
 * Every highlight belonging to one source, newest first. Articles and sources
 * share an id space, so an article's id works as `source_id` here.
 */
export function SourceHighlights({ id, name }: { id: string; name: string }) {
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading, pagination, mutate } = useFetch(
    (options: { page: number }) => endpoint("/highlights", { source_id: id, page: options.page + 1, per_page: 50 }),
    {
      headers: headers(),
      parseResponse: (response) => parseResponse<Paginated<Highlight>>(response),
      mapResult: (result) => ({ data: result.data, hasMore: result.pagination.has_more }),
      initialData: [] as Highlight[],
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load highlights" },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={name}
      searchBarPlaceholder={`Filter highlights from ${name}…`}
      isShowingDetail={showingDetail && data.length > 0}
    >
      <List.EmptyView icon={Icon.Highlight} title="No highlights here yet" />
      {data.map((highlight) => (
        <HighlightListItem
          key={highlight.id}
          highlight={highlight}
          showingDetail={showingDetail}
          onToggleDetail={() => setShowingDetail((value) => !value)}
          mutate={mutate}
        />
      ))}
    </List>
  );
}
