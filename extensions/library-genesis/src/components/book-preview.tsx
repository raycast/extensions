import { List } from "@raycast/api";

import { useCoverPreviewSize } from "@/hooks/use-cover-preview-size";
import type { BookEntry } from "@/types";

interface BookPreviewProps {
  book: BookEntry;
  coverPath?: string;
  loading: boolean;
}

export function BookPreview({ book, coverPath, loading }: BookPreviewProps) {
  const size = useCoverPreviewSize(coverPath);
  const markdown = coverPath
    ? `![Book cover](<${coverPath}?raycast-width=${size.width}&raycast-height=${size.height}>)`
    : loading
      ? "Loading cover…"
      : "Cover unavailable";

  return (
    <List.Item.Detail
      isLoading={loading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
          {book.author && <List.Item.Detail.Metadata.Label title="Author(s)" text={book.author} />}
          {book.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={book.publisher} />}
          {book.year && <List.Item.Detail.Metadata.Label title="Year" text={book.year} />}
          {book.language && <List.Item.Detail.Metadata.Label title="Language" text={book.language} />}
          {book.pages && book.pages !== "0" && <List.Item.Detail.Metadata.Label title="Pages" text={book.pages} />}

          <List.Item.Detail.Metadata.Separator />
          {book.extension && <List.Item.Detail.Metadata.Label title="Extension" text={book.extension.toUpperCase()} />}
          {book.fileSize && <List.Item.Detail.Metadata.Label title="Size" text={book.fileSize} />}
          {book.timeAdded && <List.Item.Detail.Metadata.Label title="Time added" text={book.timeAdded} />}
          {book.timeLastModified && (
            <List.Item.Detail.Metadata.Label title="Time modified" text={book.timeLastModified} />
          )}

          <List.Item.Detail.Metadata.Separator />
          {book.isbn && <List.Item.Detail.Metadata.Label title="ISBN" text={book.isbn} />}
          <List.Item.Detail.Metadata.Label title="MD5" text={book.md5} />
          {book.id && <List.Item.Detail.Metadata.Label title="ID" text={book.id} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
