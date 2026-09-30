import { Action, ActionPanel, confirmAlert, List } from "@raycast/api";
import { Icon } from "@raycast/api";
import { formatAuthors, formatAuthorsWithSeries, formatSeriesPosition } from "../helpers/books";
import { CurrentUser } from "../api/me";
import { removeBookFromList, TransformedListBook, TransformedList } from "../api/books";
import BookDetail from "./BookDetail";
import { showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { useState } from "react";

type ListBooksProps = {
  listBooks: TransformedListBook[];
  me?: CurrentUser;
  mutateList: MutatePromise<TransformedList[], undefined>;
};

export default function ListBooks({ listBooks, me, mutateList }: ListBooksProps) {
  const [listBooksState, setListBooksState] = useState(listBooks);

  return (
    <List searchBarPlaceholder="Search books">
      {listBooksState.map((listBook) => {
        const author_names = formatAuthors(listBook?.book?.contributions || []);
        const series_position = formatSeriesPosition(listBook?.book?.featured_series);

        return (
          <List.Item
            key={listBook.book.id}
            icon={listBook.book?.image?.url ? { source: listBook.book.image.url } : Icon.Book}
            title={listBook.book?.title || ""}
            subtitle={formatAuthorsWithSeries(author_names, series_position)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<BookDetail searchBook={listBook.book} me={me} setListBooksState={setListBooksState} />}
                />
                <Action.OpenInBrowser
                  title="View on Hardcover"
                  url={`https://hardcover.app/books/${listBook.book.slug}`}
                />
                <Action
                  title="Remove Book"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                      })
                    ) {
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Deleting...",
                      });
                      await mutateList(removeBookFromList(listBook.id));
                      setListBooksState((prev) => prev.filter((b) => b.id !== listBook.id));
                      showToast({
                        style: Toast.Style.Success,
                        title: "Success",
                        message: `Removed ${listBook.book.title}`,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
