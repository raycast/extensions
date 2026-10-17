import { Action, ActionPanel, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { FacetDropdown } from "./components/FacetDropdown";
import { Reader } from "./components/Reader";
import { githubTreeUrl, type CommunityBookEntry } from "./domain/community";
import { ALL_FILTER, collectFacets, decodeFilter, filterBooks } from "./domain/filters";
import { languageLabel } from "./domain/languages";
import { errorMessage } from "./errors";
import { LIBRARY_KEYS } from "./keymap";
import { readPreferences } from "./preferences";
import { downloadCommunityBook, fetchCommunityIndex } from "./services/community-client";
import { getLibraryStore } from "./storage";
import type { LibraryStore } from "./storage/library-store";
import { hueColor } from "./theme/colors";

async function installedCommunityBooks(store: LibraryStore): Promise<Record<string, string>> {
  const { books } = await store.list();
  const installed: Record<string, string> = {};
  for (const book of books) {
    if (book.source.kind === "community") {
      installed[book.source.slug] = book.id;
    }
  }
  return installed;
}

export default function Command() {
  const preferences = useMemo(readPreferences, []);
  const store = useMemo(getLibraryStore, []);
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState(ALL_FILTER);
  const [adding, setAdding] = useState<string | null>(null);

  const indexUrl = preferences.communityIndexUrl;
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchCommunityIndex, [indexUrl], {
    keepPreviousData: true,
  });
  const { data: installed, revalidate: revalidateInstalled } = usePromise(installedCommunityBooks, [store]);

  const entries = data?.index.books ?? [];
  const facets = useMemo(() => collectFacets(entries), [entries]);
  const visible = useMemo(
    () => filterBooks(entries, decodeFilter(filterValue), searchText),
    [entries, filterValue, searchText],
  );
  const isFiltered = filterValue !== ALL_FILTER || searchText.trim() !== "";
  const hidden = entries.length - visible.length;

  function clearFilters() {
    setSearchText("");
    setFilterValue(ALL_FILTER);
  }

  async function addToLibrary(entry: CommunityBookEntry) {
    setAdding(entry.slug);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading “${entry.title}”…` });
    try {
      const book = await store.create(await downloadCommunityBook(entry, indexUrl));
      toast.style = Toast.Style.Success;
      toast.title = `Added “${book.title}” to your library`;
      revalidateInstalled();
    } catch (addError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add book";
      toast.message = errorMessage(addError);
    } finally {
      setAdding(null);
    }
  }

  const skipped = data?.skipped.length ?? 0;

  return (
    <List
      isLoading={isLoading || adding !== null}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search community books"
      searchBarAccessory={<FacetDropdown facets={facets} value={filterValue} onChange={setFilterValue} />}
    >
      {error && !data ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Community library unavailable"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title={entries.length === 0 ? "No books found" : "No matching books"}
          description={
            entries.length === 0
              ? undefined
              : `${hidden} ${hidden === 1 ? "book is" : "books are"} hidden by the search or filter.`
          }
          actions={
            isFiltered ? (
              <ActionPanel>
                <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={clearFilters} />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      <List.Section
        title="Community Books"
        subtitle={skipped > 0 ? `${visible.length} · ${skipped} invalid skipped` : String(visible.length)}
      >
        {data
          ? visible.map((entry) => {
              const bookId = installed?.[entry.slug];
              return (
                <List.Item
                  key={entry.slug}
                  title={entry.title}
                  subtitle={entry.authors.join(", ")}
                  icon={{ source: Icon.Book, tintColor: hueColor(preferences.mood, "accent.primary") }}
                  accessories={[
                    ...(bookId
                      ? [
                          {
                            icon: { source: Icon.CheckCircle, tintColor: hueColor(preferences.mood, "status.success") },
                            tooltip: "In your library",
                          },
                        ]
                      : []),
                    {
                      tag: {
                        value: languageLabel(entry.language),
                        color: hueColor(preferences.mood, "accent.secondary"),
                      },
                    },
                    { text: entry.license, tooltip: entry.summary || undefined },
                  ]}
                  actions={
                    <ActionPanel>
                      {bookId ? (
                        <Action.Push title="Read" icon={Icon.Book} target={<Reader bookId={bookId} />} />
                      ) : (
                        <Action title="Add to Library" icon={Icon.Download} onAction={() => addToLibrary(entry)} />
                      )}
                      <Action.OpenInBrowser title="Open on GitHub" url={githubTreeUrl(data.index, entry)} />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={LIBRARY_KEYS.refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel>
                  }
                />
              );
            })
          : null}
      </List.Section>
    </List>
  );
}
