import { Action, ActionPanel, Color, Detail, showToast, Toast, confirmAlert } from "@raycast/api";
import {
  addBookToList,
  removeBookFromList,
  removeBookStatus,
  SearchBook,
  TransformedListBook,
  updateBookRating,
  updateBookStatus,
  UserBookStatusMapping,
} from "../api/books";
import {
  formatAuthors,
  formatSeriesPosition,
  formatUserBookLists,
  formatUserBookStatus,
  formatUserBookRating,
  getAvailableLists,
} from "../helpers/books";
import useLists from "../hooks/useLists";
import useGetUserBook from "../hooks/useGetUserBook";
import { CurrentUser } from "../api/me";

type BookDetailProps = {
  searchBook: SearchBook;
  me: CurrentUser | undefined;
  setListBooksState?: React.Dispatch<React.SetStateAction<TransformedListBook[]>>;
};

export default function BookDetail({ searchBook, me, setListBooksState }: BookDetailProps) {
  const { lists, isListLoading } = useLists();
  const { book, isBookLoading, mutateBook } = useGetUserBook(searchBook.id, me?.id || 0);

  const author_names = formatAuthors(searchBook.contributions || []);
  const series_position = formatSeriesPosition(searchBook.featured_series);
  const user_book_lists = formatUserBookLists(book?.list_books || []);
  const user_book_status = formatUserBookStatus(book);
  const user_book_rating = formatUserBookRating(book);
  const available_lists = getAvailableLists(lists, book);

  const markdown = `
  # ${searchBook.title}
  ${author_names ? `*by ${author_names}*` : ""}

  ${searchBook.image?.url ? `![Book Cover](${searchBook.image.url}?raycast-height=180)` : ""}

  ${searchBook.description || ""}
  `;

  return (
    <Detail
      isLoading={isBookLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {user_book_lists.length > 0 ? (
            <Detail.Metadata.TagList title="Added to List(s)">
              {user_book_lists.map((list) => (
                <Detail.Metadata.TagList.Item key={list} text={list} color={Color.PrimaryText} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {user_book_status ? <Detail.Metadata.Label title="Reading Status" text={user_book_status} /> : null}
          {user_book_rating ? (
            <Detail.Metadata.Label title="Your Rating" text={`★${user_book_rating.toFixed(2).toString()}`} />
          ) : null}
          {user_book_lists.length > 0 || user_book_status || user_book_rating ? <Detail.Metadata.Separator /> : null}

          {series_position ? (
            <Detail.Metadata.Link
              title="Series"
              target={`https://hardcover.app/series/${searchBook.slug}`}
              text={series_position}
            />
          ) : null}
          <Detail.Metadata.Label title="Release date" text={searchBook.release_date} />
          <Detail.Metadata.Label
            title="Average Rating"
            text={`★${searchBook.rating?.toFixed(2).toString()} • ${searchBook.ratings_count} Ratings`}
          />
          <Detail.Metadata.TagList title="Genres">
            {searchBook.genres?.map((genre) => (
              <Detail.Metadata.TagList.Item key={genre} text={genre} color={Color.PrimaryText} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Hardcover" url={`https://hardcover.app/books/${searchBook.slug}`} />
          <ActionPanel.Section>
            <ActionPanel.Submenu title="Update Reading Status" isLoading={isBookLoading}>
              {Object.entries(UserBookStatusMapping).map(([key, val]) => (
                <Action
                  key={key}
                  title={val}
                  onAction={async () => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Updating...",
                    });
                    await mutateBook(updateBookStatus(searchBook.id, Number(key)));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success",
                      message: `Updated reading status to ${val}`,
                    });
                  }}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title="Update Rating" isLoading={isBookLoading}>
              {["Remove rating", 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((rating) => (
                <Action
                  key={rating}
                  title={String(rating)}
                  onAction={async () => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Updating...",
                    });
                    const ratingValue = rating === "Remove rating" ? "" : rating;
                    await mutateBook(updateBookRating(searchBook.id, ratingValue));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success",
                      message: rating === "Remove rating" ? "Removed rating" : `Updated rating to ${rating} stars`,
                    });
                  }}
                />
              ))}
            </ActionPanel.Submenu>
            {user_book_status && book ? (
              <Action
                title="Remove"
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Are you sure?",
                      message: "This will remove your review, rating and status.",
                    })
                  ) {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Removing...",
                    });
                    await mutateBook(removeBookStatus(book.user_books[0].id));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success",
                      message: "Removed",
                    });
                  }
                }}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage Lists">
            <ActionPanel.Submenu title="Add Book to List" isLoading={isListLoading}>
              {available_lists.map((list) => (
                <Action
                  key={list.id}
                  title={list.name}
                  onAction={async () => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Adding...",
                    });
                    await mutateBook(addBookToList(list.id, searchBook.id));
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success",
                      message: `Added to ${list.name}`,
                    });
                  }}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title="Remove Book from List" isLoading={isListLoading}>
              {book?.list_books?.map((list_book) => (
                <Action
                  key={list_book.list?.id}
                  title={list_book.list?.name || ""}
                  onAction={async () => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Removing...",
                    });
                    await mutateBook(removeBookFromList(list_book.id));
                    if (setListBooksState) {
                      setListBooksState((prev) => prev.filter((b) => b.id !== list_book.id));
                    }
                    showToast({
                      style: Toast.Style.Success,
                      title: "Success",
                      message: `Removed from ${list_book.list?.name || ""}`,
                    });
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
