import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import client from "./utils/client";
import { GET_BOOK_DETAILS } from "./queries/getBookDetails";
import { UPDATE_STATUS } from "./mutations/updateStatus";
import CreateReview from "./components/create-review";
import { Book } from "./types";
import { useMutation, useQuery } from "@apollo/client";
import { GET_BOOKS } from "./queries/getBooks";
import { ApolloProvider } from "@apollo/client";

interface BookDetailsProps {
  isbn: string;
  id: string;
}

export default function BookDetails(props: BookDetailsProps) {
  const { isbn, id } = props;
  const { loading, data } = useQuery<{ book: Book }>(GET_BOOK_DETAILS, {
    variables: {
      isbn13: isbn,
    },
  });

  const markdown = loading || !data ? "" : getMarkdown(data);

  const [updateReadingStatus] = useMutation(UPDATE_STATUS, {
    onCompleted: () => {
      showToast({
        style: Toast.Style.Success,
        title: "Successfully updated",
      });
    },
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update book status",
      });
    },
    refetchQueries: [GET_BOOKS],
  });

  return (
    <Detail
      isLoading={loading}
      navigationTitle={data?.book.title || "Book"}
      markdown={markdown}
      metadata={<Metadata show={true} book={data?.book} />}
      actions={
        data ? (
          <ActionPanel>
            {data.book.slug && <Action.OpenInBrowser url={`https://literal.club/book/${data.book.slug}`} />}
            <ActionPanel.Submenu
              icon={Icon.Book}
              title="Update Reading Status"
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            >
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Green }}
                title="Finished"
                onAction={() =>
                  updateReadingStatus({
                    variables: {
                      bookId: id,
                      readingStatus: "FINISHED",
                    },
                  })
                }
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                title="Reading"
                onAction={() =>
                  updateReadingStatus({
                    variables: {
                      bookId: data.book.id,
                      readingStatus: "IS_READING",
                    },
                  })
                }
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
                title="Want to Read"
                onAction={() =>
                  updateReadingStatus({
                    variables: {
                      bookId: data.book.id,
                      readingStatus: "WANTS_TO_READ",
                    },
                  })
                }
              />
              <Action
                icon={{ source: Icon.Circle, tintColor: Color.Red }}
                title="Stopped Reading"
                onAction={() =>
                  updateReadingStatus({
                    variables: {
                      bookId: data.book.id,
                      readingStatus: "DROPPED",
                    },
                  })
                }
              />
            </ActionPanel.Submenu>
            <Action.Push
              icon={Icon.SpeechBubble}
              title="Create Review"
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <ApolloProvider client={client}>
                  <CreateReview title={data.book.title || "Book"} bookId={data.book.id} />
                </ApolloProvider>
              }
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}

interface MarkdownProps {
  book: Book;
}

const getMarkdown = (item: MarkdownProps): string => {
  return `
## ${item?.book.title}
${item?.book.subtitle ? `### *${item?.book.subtitle}*` : ""}

${item.book.cover ? `<img src="${item.book.cover}" alt="Image" height="230"/>` : ""}

${getDescription(item)}  

`;
};

const getDescription = (item: MarkdownProps): string => {
  if (item.book.description)
    return `
  ## Description

  ${item.book.description}
`;
  return "";
};

interface MetadataProps {
  show: boolean;
  book?: Book;
}

const Metadata = (props: MetadataProps) => {
  const { show, book } = props;
  if (!show || !book) {
    return null;
  }

  const publishedDate = new Date(book.publishedDate);
  const formattedDate = `${publishedDate.getDate()}/${publishedDate.getMonth() + 1}/${publishedDate.getFullYear()}`;

  return (
    <Detail.Metadata>
      {book.authors.length > 0 ? (
        <Detail.Metadata.Link
          title="Author"
          text={book.authors[0].name}
          target={`https://literal.club/author/${book.authors[0].id}`}
        />
      ) : null}
      {book.pageCount ? <Detail.Metadata.Label title="Page Count" text={`${book.pageCount} pages`} /> : null}
      {book.publishedDate ? <Detail.Metadata.Label title="Edition Release Date" text={formattedDate} /> : null}
      {book.publisher ? <Detail.Metadata.Label title="Publisher" text={book.publisher} /> : null}
      {book.isbn10 ? <Detail.Metadata.Label title="ISBN" text={book.isbn10} /> : null}
      {book.isbn13 ? <Detail.Metadata.Label title="ISBN13" text={book.isbn13} /> : null}
      {book.language ? <Detail.Metadata.Label title="Language" text={book.language} /> : null}
    </Detail.Metadata>
  );
};
