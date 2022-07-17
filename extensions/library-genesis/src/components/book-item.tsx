import { List, ActionPanel, Action } from "@raycast/api";
import { BookEntry } from "../types";

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
      actions={
        <ActionPanel title="#1 in raycast/extensions">
          <Action.OpenInBrowser url={book.url} />
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={book.url} />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
              {book.author && <List.Item.Detail.Metadata.Label title="Author(s)" text={book.author} />}
              {book.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={book.publisher} />}
              {book.year && <List.Item.Detail.Metadata.Label title="Year" text={book.year} />}
              {book.language && <List.Item.Detail.Metadata.Label title="Language" text={book.language} />}
              {book.pages && <List.Item.Detail.Metadata.Label title="Pages" text={book.pages} />}
              <List.Item.Detail.Metadata.Separator />
              {book.timeAdded && <List.Item.Detail.Metadata.Label title="Time added" text={book.timeAdded} />}
              {book.extension && (
                <List.Item.Detail.Metadata.Label title="Extension" text={book.extension.toUpperCase()} />
              )}
              {book.fileSize && <List.Item.Detail.Metadata.Label title="Size" text={book.fileSize} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
