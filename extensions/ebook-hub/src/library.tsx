import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { BookMetadataForm } from "./components/BookMetadataForm";
import { FacetDropdown } from "./components/FacetDropdown";
import { ImportBookForm } from "./components/ImportBookForm";
import { Reader } from "./components/Reader";
import { ApplyHueThemeSubmenu } from "./components/ThemeActions";
import type { BookManifest, ReadingProgress } from "./domain/book";
import { ALL_FILTER, collectFacets, decodeFilter, filterBooks } from "./domain/filters";
import { languageLabel } from "./domain/languages";
import { formatReadingTime } from "./domain/progress";
import { LIBRARY_KEYS } from "./keymap";
import { readPreferences } from "./preferences";
import { forgetLastOpened, getLibraryStore } from "./storage";
import type { LibraryStore, UnreadableBook } from "./storage/library-store";
import { hueColor } from "./theme/colors";

interface LibraryBook extends BookManifest {
  progress: ReadingProgress | null;
}

async function loadLibrary(store: LibraryStore): Promise<{ books: LibraryBook[]; unreadable: UnreadableBook[] }> {
  const { books, unreadable } = await store.list();
  const withProgress = await Promise.all(
    books.map(async (book) => {
      try {
        return { ...book, progress: await store.readProgress(book.id) };
      } catch (error) {
        // Unreadable progress must not hide the book; the reader reports it on open.
        console.error(`Progress for ${book.id} is unreadable`, error);
        return { ...book, progress: null };
      }
    }),
  );
  const lastActivity = (book: LibraryBook) => book.progress?.updatedAt ?? book.updatedAt;
  withProgress.sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
  return { books: withProgress, unreadable };
}

export default function Command() {
  const store = useMemo(getLibraryStore, []);
  const preferences = useMemo(readPreferences, []);
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState(ALL_FILTER);
  const { data, isLoading, revalidate } = usePromise(loadLibrary, [store]);

  const books = data?.books ?? [];
  const facets = useMemo(() => collectFacets(books), [books]);
  const visibleBooks = useMemo(
    () => filterBooks(books, decodeFilter(filterValue), searchText),
    [books, filterValue, searchText],
  );
  const isFiltered = filterValue !== ALL_FILTER || searchText.trim() !== "";
  const hiddenBooks = books.length - visibleBooks.length;

  function clearFilters() {
    setSearchText("");
    setFilterValue(ALL_FILTER);
  }

  async function deleteBook(bookId: string, title: string) {
    const confirmed = await confirmAlert({
      title: `Delete “${title}”?`,
      message: "The book, its reading progress, and bookmarks will be removed from this Mac.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await store.delete(bookId);
      await forgetLastOpened(bookId);
      await showToast({ style: Toast.Style.Success, title: "Book deleted" });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete book" });
    }
  }

  const importAction = (
    <Action.Push
      title="Import Book"
      icon={Icon.Download}
      shortcut={LIBRARY_KEYS.importBook}
      target={<ImportBookForm onImported={revalidate} />}
    />
  );
  const browseAction = (
    <Action
      title="Browse Community Library"
      icon={Icon.Globe}
      onAction={async () => {
        try {
          await launchCommand({ name: "browse-community", type: LaunchType.UserInitiated });
        } catch (error) {
          await showFailureToast(error, { title: "Could not open the Community Library" });
        }
      }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by title, author, or category"
      searchBarAccessory={
        <FacetDropdown facets={facets} value={filterValue} onChange={setFilterValue} includeVisibility />
      }
    >
      <List.EmptyView
        icon={Icon.Book}
        title={books.length === 0 ? "Your library is empty" : "No matching books"}
        description={
          books.length === 0
            ? "Import a Markdown, text, EPUB, or PDF file, or add a community book."
            : `${hiddenBooks} ${hiddenBooks === 1 ? "book is" : "books are"} hidden by the search or filter.`
        }
        actions={
          <ActionPanel>
            {isFiltered ? <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={clearFilters} /> : null}
            {importAction}
            {browseAction}
          </ActionPanel>
        }
      />
      <List.Section title="Books" subtitle={String(visibleBooks.length)}>
        {visibleBooks.map((book) => (
          <List.Item
            key={book.id}
            title={book.title}
            subtitle={book.authors.join(", ")}
            icon={{ source: Icon.Book, tintColor: hueColor(preferences.mood, "accent.primary") }}
            keywords={book.categories}
            accessories={[
              ...(book.visibility === "private" ? [{ icon: Icon.Lock, tooltip: "Private" }] : []),
              { tag: { value: languageLabel(book.language), color: hueColor(preferences.mood, "accent.secondary") } },
              book.progress
                ? { text: `${book.progress.percent}%`, tooltip: "Read" }
                : { text: formatReadingTime(book.totalWords), tooltip: "Reading time" },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title={book.progress ? "Continue Reading" : "Start Reading"}
                    icon={Icon.Book}
                    target={<Reader bookId={book.id} />}
                    onPop={revalidate}
                  />
                  <Action.Push
                    title="Edit Metadata"
                    icon={Icon.Pencil}
                    shortcut={LIBRARY_KEYS.editMetadata}
                    target={<BookMetadataForm book={book} onSaved={revalidate} />}
                  />
                  <Action.ShowInFinder path={store.bookPath(book.id)} shortcut={LIBRARY_KEYS.showInFinder} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {importAction}
                  {browseAction}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={LIBRARY_KEYS.refresh}
                    onAction={revalidate}
                  />
                  <ApplyHueThemeSubmenu />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Book"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteBook(book.id, book.title)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {data && data.unreadable.length > 0 ? (
        <List.Section title="Unreadable Books">
          {data.unreadable.map((item) => (
            <List.Item
              key={item.bookId}
              title={item.bookId}
              subtitle={item.message}
              icon={{ source: Icon.Warning, tintColor: hueColor(preferences.mood, "status.warning") }}
              actions={
                <ActionPanel>
                  <Action.ShowInFinder path={store.bookPath(item.bookId)} />
                  <Action
                    title="Delete Book"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteBook(item.bookId, item.bookId)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
