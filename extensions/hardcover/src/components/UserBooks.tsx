import { Action, ActionPanel, List } from "@raycast/api";
import { Icon } from "@raycast/api";
import { formatAuthors, formatAuthorsWithSeries, formatSeriesPosition } from "../helpers/books";
import { TransformedUserBook } from "../api/books";
import BookDetail from "./BookDetail";
import { CurrentUser } from "../api/me";
import { MutatePromise } from "@raycast/utils";
import BookStatusSubmenu from "./actions/BookStatusSubmenu";
import BookRatingSubmenu from "./actions/BookRatingSubmenu";
import DeleteBookAction from "./actions/DeleteBookAction";

type UserBooksProps = {
  userBooks: TransformedUserBook[];
  me?: CurrentUser;
  isUserBooksLoading: boolean;
  mutateUserBooks?: MutatePromise<TransformedUserBook[], undefined>;
};

export default function UserBooks({ userBooks, me, isUserBooksLoading, mutateUserBooks }: UserBooksProps) {
  return (
    <List searchBarPlaceholder="Search books" isLoading={isUserBooksLoading}>
      {userBooks?.map((userBook) => {
        const author_names = formatAuthors(userBook.book?.contributions || []);
        const series_position = formatSeriesPosition(userBook.book?.featured_series);

        return (
          <List.Item
            key={userBook.book.id}
            icon={userBook.book?.image?.url ? { source: userBook.book.image.url } : Icon.Book}
            title={userBook.book?.title || ""}
            subtitle={formatAuthorsWithSeries(author_names, series_position)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Sidebar}
                  target={<BookDetail searchBook={userBook.book} me={me} mutateUserBooks={mutateUserBooks} />}
                />
                <Action.OpenInBrowser
                  title="View on Hardcover"
                  url={`https://hardcover.app/books/${userBook.book.slug}`}
                />
                <ActionPanel.Section>
                  <BookStatusSubmenu
                    isLoading={isUserBooksLoading}
                    bookId={userBook.book.id}
                    mutateUserBooks={mutateUserBooks}
                  />
                  <BookRatingSubmenu isLoading={isUserBooksLoading} bookId={userBook.book.id} />
                  <DeleteBookAction userBookId={userBook.id} mutateUserBooks={mutateUserBooks} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
