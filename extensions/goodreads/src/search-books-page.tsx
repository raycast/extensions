import React, { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchBooksByTitle, getDetailsPageUrl } from "./goodreads-api";
import type { Book } from "./types";
import BookDetails from "./book-details";
import { STRINGS } from "./strings";
import { useRecentlyViewedBooks } from "./useRecentlyViewedBooks";

interface SearchBooksPageProps {
  arguments: {
    title: string;
  };
}

export default function SearchBooksPage(props: SearchBooksPageProps) {
  const [searchQuery, setSearch] = useState(props.arguments.title);
  const trimmedQuery = searchQuery?.trim();
  const { data, isLoading } = useCachedPromise(fetchBooksByTitle, [trimmedQuery], {
    execute: trimmedQuery?.length > 0,
    keepPreviousData: true,
  });
  const { recentlyViewedBooks, addRecentView, clearAllRecentViews, clearRecentlyViewedBook } = useRecentlyViewedBooks();

  const mode = trimmedQuery?.length > 0 ? "search" : "recent";
  let books = data?.data;
  let sectionTitle = STRINGS.searchResults;

  // If searchQuery is empty, show recently viewed books as ZeroQuery suggestions
  if (mode === "recent") {
    books = recentlyViewedBooks;
    sectionTitle = STRINGS.recentBooks;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      throttle
      searchBarPlaceholder={STRINGS.searchBooksPlaceholder}
      onSearchTextChange={setSearch}
    >
      <List.Section title={sectionTitle}>
        {books?.map((book) => (
          <BookItem
            key={book.id}
            book={book}
            onBookClick={addRecentView}
            onRemoveFromRecent={clearRecentlyViewedBook}
            onClearAllRecent={clearAllRecentViews}
            mode={mode}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface BookItemProps {
  book: Book;
  mode: "search" | "recent";
  onBookClick: (book: Book) => void;
  onRemoveFromRecent: (bookId: string) => void;
  onClearAllRecent: () => void;
}

function BookItem(props: BookItemProps) {
  const { book, onBookClick, onRemoveFromRecent, onClearAllRecent, mode } = props;
  const { author, title, thumbnail, contentUrl, rating } = book;
  const detailsPageUrl = getDetailsPageUrl(contentUrl.detailsPage);

  const isRecentMode = mode === "recent";

  return (
    <List.Item
      title={title}
      subtitle={author}
      accessories={[{ text: `${rating} ⭐️` }]}
      icon={thumbnail ? { source: thumbnail } : Icon.Book}
      actions={
        <ActionPanel>
          <>
            <Action.Push
              icon={Icon.Window}
              title={STRINGS.showDetails}
              target={<BookDetails bookTitle={title} qualifier={contentUrl.detailsPage} />}
              onPush={() => onBookClick(book)}
            />
            <Action.OpenInBrowser url={detailsPageUrl} />
          </>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title={STRINGS.copyTitle}
              content={title}
            />
            <Action.CopyToClipboard
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              title={STRINGS.copyUrl}
              content={detailsPageUrl}
            />
          </ActionPanel.Section>

          {isRecentMode && (
            <ActionPanel.Section>
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title={STRINGS.removeFromRecent}
                onAction={() => onRemoveFromRecent(book.id)}
              />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title={STRINGS.clearAllRecent}
                onAction={onClearAllRecent}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
