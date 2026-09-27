import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { SourceHighlights } from "./components/SourceHighlights";
import { endpoint, headers, Paginated, parseResponse, Source, sourceUrl } from "./lib/screvi";
import { coverImage, formatDate, SOURCE_TYPE_LABELS, sourceIcon, tagTint } from "./lib/format";

const PER_PAGE = 50;

/** The types worth offering as a filter; the rest are internal groupings. */
const FILTERABLE_TYPES = ["book", "article", "podcast", "video", "tweet", "self", "custom"] as const;

export default function BrowseSources() {
  const [searchText, setSearchText] = useState("");
  const [type, setType] = useState("");

  // No include_empty: a source here means something you have highlighted.
  // Articles with no highlights belong to Browse Article Library, and pulling
  // them in made the two commands return identical lists.
  const { data, isLoading, pagination } = useFetch(
    (options: { page: number }) =>
      endpoint("/sources", {
        search: searchText.trim(),
        type,
        page: options.page + 1,
        per_page: PER_PAGE,
      }),
    {
      headers: headers(),
      parseResponse: (response) => parseResponse<Paginated<Source>>(response),
      mapResult: (result) => ({ data: result.data, hasMore: result.pagination.has_more }),
      initialData: [] as Source[],
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load your sources" },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search books, podcasts and videos by title or author…"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" storeValue onChange={setType}>
          <List.Dropdown.Item title="Everything" value="" icon={Icon.List} />
          <List.Dropdown.Section title="Type">
            {FILTERABLE_TYPES.map((item) => (
              <List.Dropdown.Item key={item} title={SOURCE_TYPE_LABELS[item]} value={item} icon={sourceIcon(item)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Book}
        title={searchText ? "Nothing matched" : "No books or podcasts yet"}
        description={
          searchText
            ? "Try the author's name, or a word from the title."
            : "Books and articles you save will land here."
        }
      />
      {data.map((source) => (
        <SourceListItem key={source.id} source={source} />
      ))}
    </List>
  );
}

function SourceListItem({ source }: { source: Source }) {
  const accessories: List.Item.Accessory[] = [];
  for (const tag of source.tags.slice(0, 2)) {
    accessories.push({ tag: { value: tag.name, color: tagTint(tag) } });
  }
  if (source.highlight_count > 0) {
    accessories.push({
      icon: Icon.Highlight,
      text: String(source.highlight_count),
      tooltip: `${source.highlight_count} highlight${source.highlight_count === 1 ? "" : "s"}`,
    });
  }
  const added = formatDate(source.created_at);
  if (added) accessories.push({ text: added, tooltip: "Added" });

  return (
    <List.Item
      icon={coverImage(source.image_url, source.type)}
      title={source.name}
      subtitle={source.author ?? SOURCE_TYPE_LABELS[source.type] ?? source.type}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {source.highlight_count > 0 ? (
              <Action.Push
                title="Show Highlights"
                icon={Icon.Highlight}
                target={<SourceHighlights id={source.id} name={source.name} />}
              />
            ) : null}
            <Action.OpenInBrowser title="Open in Screvi" url={sourceUrl(source.id)} icon={Icon.AppWindow} />
            {source.url ? (
              <Action.OpenInBrowser
                title="Open Original"
                url={source.url}
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Title" content={source.name} />
            <Action.CopyToClipboard
              title="Copy Screvi Link"
              content={sourceUrl(source.id)}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
