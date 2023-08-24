import React, { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchBooksByTitle, getDetailsPageUrl } from "./goodreads-api";
import type { Book } from "./types";
import BookDetails from "./book-details";
import { STRINGS } from "./strings";

interface SearchBooksPageProps {
  arguments: {
    title: string;
  };
}

export default function SearchBooksPage(props: SearchBooksPageProps) {
  const [searchQuery, setSearch] = useState(props.arguments.title);
  const { data, isLoading } = useCachedPromise(fetchBooksByTitle, [searchQuery], { execute: searchQuery.length > 0 });

  return (
    <List
      isLoading={isLoading}
      searchText={searchQuery}
      throttle
      searchBarPlaceholder={STRINGS.searchBooksPlaceholder}
      onSearchTextChange={setSearch}
    >
      {data?.data?.map((book) => (
        <BookItem key={book.id} book={book} />
      ))}
    </List>
  );
}

interface BookItemProps {
  book: Book;
}

function BookItem(props: BookItemProps) {
  const { book } = props;
  const { author, title, thumbnail, contentUrl, rating } = book;
  const detailsPageUrl = getDetailsPageUrl(contentUrl.detailsPage);

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
        </ActionPanel>
      }
    />
  );
}
