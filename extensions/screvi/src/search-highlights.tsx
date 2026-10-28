import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { HighlightListItem } from "./components/HighlightListItem";
import { endpoint, headers, Highlight, Paginated, parseResponse } from "./lib/screvi";
import { tagTint } from "./lib/format";
import { useTags } from "./lib/useTags";

const PER_PAGE = 50;

export default function SearchHighlights() {
  const [searchText, setSearchText] = useState("");
  const [tag, setTag] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);

  const query = searchText.trim();

  const { data: tags } = useTags();

  // Empty query lists the newest highlights; a query runs Screvi's hybrid
  // semantic + keyword search, which is capped at 50 results per page.
  const { data, isLoading, pagination, mutate } = useFetch(
    (options: { page: number }) =>
      query
        ? endpoint("/search", { q: query, tag, page: options.page + 1, per_page: PER_PAGE })
        : endpoint("/highlights", { tag, page: options.page + 1, per_page: PER_PAGE }),
    {
      headers: headers(),
      parseResponse: (response) => parseResponse<Paginated<Highlight>>(response),
      mapResult: (result) => ({ data: result.data, hasMore: result.pagination.has_more }),
      initialData: [] as Highlight[],
      keepPreviousData: true,
      failureToastOptions: { title: "Screvi search failed" },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your highlights by meaning, not just words…"
      isShowingDetail={showingDetail && data.length > 0}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" storeValue onChange={setTag}>
          <List.Dropdown.Item title="All Tags" value="" icon={Icon.Tag} />
          <List.Dropdown.Section title="Tags">
            {tags.map((item) => (
              <List.Dropdown.Item
                key={item.id}
                title={`${item.name} (${item.highlight_count})`}
                value={item.name}
                icon={{ source: Icon.Tag, tintColor: tagTint(item) }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Highlight}
        title={query ? "No highlights matched" : "No highlights yet"}
        description={
          query
            ? "Try a looser phrasing — search is semantic, so describing the idea often beats quoting it."
            : "Highlights you save in Screvi will show up here."
        }
      />
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
