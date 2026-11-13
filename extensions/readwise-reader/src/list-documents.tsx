import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { list } from "./api/list";
import { titlecase } from "./utils/titlecase";
import { type Document } from "./utils/document";
import { type Category } from "./utils/category";
import { type PaginationOptions } from "@raycast/utils/dist/types";
import { getOpenUrlFromFullUrl } from "./utils";
import {
  dedupeById,
  defaultDirectionFor,
  sortDocuments,
  type SortBy,
  type SortDirection,
} from "./utils/sort-documents";

function getProgressIcon(readingProgress: number) {
  const asPercentage = readingProgress * 100;
  if (asPercentage === 0) {
    return Icon.Circle;
  } else if (asPercentage === 100) {
    return Icon.CircleProgress100;
  } else if (asPercentage > 0 && asPercentage <= 50) {
    return Icon.CircleProgress25;
  } else if (asPercentage > 50 && asPercentage < 75) {
    return Icon.CircleProgress50;
  } else {
    return Icon.CircleProgress75;
  }
}

// "cmd"/"ctrl" are ambiguous modifiers that Raycast ignores on the other platform,
// so shortcuts must be defined per-platform to also work on Windows.
function categoryShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd"], key },
    Windows: { modifiers: ["ctrl"], key },
  };
}

const SORT_LABELS: Record<SortBy, string> = {
  last_moved_at: "Date Moved",
  saved_at: "Date Saved",
  published_date: "Date Published",
  last_opened_at: "Date Last Opened",
  author: "Author",
  category: "Category",
  word_count: "Length",
  reading_progress: "Progress",
  title: "Title",
  random: "Random",
};

function sortLabel(by: SortBy, direction: SortDirection): string {
  if (by === "random") {
    return "Random";
  }
  return `${SORT_LABELS[by]} ${direction === "ascending" ? "↑" : "↓"}`;
}

export default function ListDocumentsCommand() {
  const preferences = getPreferenceValues<Preferences.ListDocuments>();
  const [documentLocation, setDocumentLocation] = useState<Document["location"]>(preferences.defaultListLocation);
  const [category, setCategory] = useState<Category | undefined>();
  const [sortBy, setSortBy] = useState<SortBy>(preferences.defaultSortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirectionFor(preferences.defaultSortBy));
  const [randomSeed, setRandomSeed] = useState(() => Date.now());

  function selectSort(next: SortBy) {
    setSortBy(next);
    if (next === "random") {
      setRandomSeed(Date.now());
    } else {
      setSortDirection(defaultDirectionFor(next));
    }
  }

  const { isLoading, data, pagination } = usePromise(
    (location, selectedCategory) => async (options: PaginationOptions<Document[]>) => {
      const { results, nextPageCursor } = await list(location, selectedCategory, options.cursor);

      return {
        data: results,
        hasMore: !!nextPageCursor,
        cursor: nextPageCursor,
      };
    },
    [documentLocation, category],
  );

  const displayData = useMemo(
    () => sortDocuments(dedupeById(data ?? []), sortBy, sortDirection, randomSeed),
    [data, sortBy, sortDirection, randomSeed],
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Location of the article to fetch"
          defaultValue={documentLocation}
          onChange={(value) => setDocumentLocation(value as Document["location"])}
        >
          <List.Dropdown.Item title="New" value="new" />
          <List.Dropdown.Item title="Shortlist" value="shortlist" />
          <List.Dropdown.Item title="Feed" value="feed" />
          <List.Dropdown.Item title="Later" value="later" />
          <List.Dropdown.Item title="Archive" value="archive" />
        </List.Dropdown>
      }
      pagination={pagination}
      navigationTitle={`Documents in ${titlecase(documentLocation)}${
        category ? ` (${titlecase(category)})` : ""
      } · ${sortLabel(sortBy, sortDirection)}`}
    >
      {data?.length === 0 && category !== undefined ? (
        <List.EmptyView
          title="No documents found"
          description={`No documents found in the "${titlecase(category)}" category.`}
          actions={
            <ActionPanel>
              <Action
                title="Reset Category Filter"
                onAction={() => setCategory(undefined)}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ) : (
        displayData.map((article) => {
          const markdown = `
# ${article.title}

${article.summary}
            `;
          return (
            <List.Item
              key={article.id}
              title={article.title}
              detail={
                <List.Item.Detail
                  markdown={markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Author" text={article.author ?? undefined} />
                      <List.Item.Detail.Metadata.Label title="Website" text={article.site_name ?? undefined} />
                      <List.Item.Detail.Metadata.Label title="Category" text={article.category ?? undefined} />
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {Object.values(article.tags ?? {}).map(({ name }) => (
                          <List.Item.Detail.Metadata.TagList.Item text={name} key={name} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              icon={getProgressIcon(article.reading_progress)}
              actions={
                <ActionPanel title={article.title}>
                  <Action
                    title="Open Article in Readwise"
                    onAction={() => open(getOpenUrlFromFullUrl(article.url))}
                    icon={Icon.Globe}
                  />
                  <Action.OpenInBrowser url={article.source_url} title="Open Article in Source Website" />
                  <ActionPanel.Submenu
                    title="Filter by Category…"
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  >
                    <Action
                      title="All Categories"
                      onAction={() => setCategory(undefined)}
                      icon={Icon.Tag}
                      shortcut={categoryShortcut("1")}
                    />
                    <Action
                      title="Article"
                      onAction={() => setCategory("article")}
                      icon={Icon.Document}
                      shortcut={categoryShortcut("2")}
                    />
                    <Action
                      title="Email"
                      onAction={() => setCategory("email")}
                      icon={Icon.Envelope}
                      shortcut={categoryShortcut("3")}
                    />
                    <Action
                      title="Rss"
                      onAction={() => setCategory("rss")}
                      icon={Icon.Wifi}
                      shortcut={categoryShortcut("4")}
                    />
                    <Action
                      title="Highlight"
                      onAction={() => setCategory("highlight")}
                      icon={Icon.Highlight}
                      shortcut={categoryShortcut("5")}
                    />
                    <Action
                      title="Note"
                      onAction={() => setCategory("note")}
                      icon={Icon.Pencil}
                      shortcut={categoryShortcut("6")}
                    />
                    <Action
                      title="Pdf"
                      onAction={() => setCategory("pdf")}
                      icon={{
                        source: {
                          light: "pdf-light.svg",
                          dark: "pdf-dark.svg",
                        },
                      }}
                      shortcut={categoryShortcut("7")}
                    />
                    <Action
                      title="Epub"
                      onAction={() => setCategory("epub")}
                      icon={Icon.Book}
                      shortcut={categoryShortcut("8")}
                    />
                    <Action
                      title="Tweet"
                      onAction={() => setCategory("tweet")}
                      icon={Icon.Bird}
                      shortcut={categoryShortcut("9")}
                    />
                    <Action
                      title="Video"
                      onAction={() => setCategory("video")}
                      icon={Icon.Video}
                      shortcut={categoryShortcut("0")}
                    />
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Sort Documents By…"
                    icon={Icon.ChevronUpDown}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "s" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                    }}
                  >
                    <Action title="Date Moved" icon={Icon.Calendar} onAction={() => selectSort("last_moved_at")} />
                    <Action title="Date Saved" icon={Icon.Calendar} onAction={() => selectSort("saved_at")} />
                    <Action title="Date Published" icon={Icon.Calendar} onAction={() => selectSort("published_date")} />
                    <Action
                      title="Date Last Opened"
                      icon={Icon.Calendar}
                      onAction={() => selectSort("last_opened_at")}
                    />
                    <Action title="Author" icon={Icon.Person} onAction={() => selectSort("author")} />
                    <Action title="Category" icon={Icon.Tag} onAction={() => selectSort("category")} />
                    <Action title="Length" icon={Icon.Text} onAction={() => selectSort("word_count")} />
                    <Action
                      title="Progress"
                      icon={Icon.CircleProgress}
                      onAction={() => selectSort("reading_progress")}
                    />
                    <Action title="Title" icon={Icon.Uppercase} onAction={() => selectSort("title")} />
                    <Action title="Random" icon={Icon.Shuffle} onAction={() => selectSort("random")} />
                  </ActionPanel.Submenu>
                  {sortBy !== "random" && (
                    <Action
                      title="Toggle Sort Direction"
                      icon={Icon.ChevronUpDown}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "o" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "o" },
                      }}
                      onAction={() =>
                        setSortDirection((current) => (current === "ascending" ? "descending" : "ascending"))
                      }
                    />
                  )}
                  {sortBy === "random" && (
                    <Action
                      title="Reshuffle"
                      icon={Icon.Shuffle}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "r" },
                        Windows: { modifiers: ["ctrl"], key: "r" },
                      }}
                      onAction={() => setRandomSeed(Date.now())}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
