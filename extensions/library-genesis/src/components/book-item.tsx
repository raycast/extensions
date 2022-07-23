import { List } from "@raycast/api";
import { BookEntry } from "../types";
import { BookActionPanel } from "./book-action-panel";

export function BookItem(props: { book: BookEntry }, key: number) {
  const { book } = props;
  const markdown = `<img src="${book.coverUrl}" alt="cover" height="180"/>`;

  return (
    <List.Item
      key={key}
      title={book.title}
      icon={{
        source: book.coverUrl,
      }}
      actions={<BookActionPanel book={book}></BookActionPanel>}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {/* book details */}
              <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
              {book.author && <List.Item.Detail.Metadata.Label title="Author(s)" text={book.author} />}
              {book.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={book.publisher} />}
              {book.year && <List.Item.Detail.Metadata.Label title="Year" text={book.year} />}
              {book.language && <List.Item.Detail.Metadata.Label title="Language" text={book.language} />}
              {book.pages && <List.Item.Detail.Metadata.Label title="Pages" text={book.pages} />}

              {/* file details */}
              <List.Item.Detail.Metadata.Separator />
              {book.extension && (
                <List.Item.Detail.Metadata.Label title="Extension" text={book.extension.toUpperCase()} />
              )}
              {book.fileSize && <List.Item.Detail.Metadata.Label title="Size" text={book.fileSize} />}
              {book.timeAdded && <List.Item.Detail.Metadata.Label title="Time added" text={book.timeAdded} />}
              {book.timeLastModified && (
                <List.Item.Detail.Metadata.Label title="Time modified" text={book.timeLastModified} />
              )}

              {/* LibGen details */}
              <List.Item.Detail.Metadata.Separator />
              {book.isbn && <List.Item.Detail.Metadata.Label title="ISBN" text={book.isbn} />}
              <List.Item.Detail.Metadata.Label title="MD5" text={book.md5} />
              {book.id && <List.Item.Detail.Metadata.Label title="ID" text={book.id} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
