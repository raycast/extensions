import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useState } from "react";
import useSearchBooks from "./hooks/useSearchBooks";
import BookDetail from "./components/BookDetail";
import { formatSeriesPosition } from "./helpers/books";
import useMe from "./hooks/useMe";

export default function Command() {
  const [query, setQuery] = useState("");
  const { me, isMeLoading } = useMe();
  const { isLoading, data, pagination } = useSearchBooks(query);

  return (
    <List
      isLoading={isLoading || isMeLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search books"
      pagination={pagination}
      throttle
    >
      {data?.map((book) => {
        const author_names = book.contributions?.map((c) => c.author?.name).join(", ");
        const series_position = formatSeriesPosition(book.featured_series);

        return (
          <List.Item
            key={book.id}
            icon={book.image?.url ? { source: book.image.url } : Icon.Book}
            title={book.title}
            subtitle={`${author_names}${series_position && ` • ${series_position}`}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<BookDetail searchBook={book} me={me} />}
                />
                <Action.OpenInBrowser title="View on Hardcover" url={`https://hardcover.app/books/${book.slug}`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
