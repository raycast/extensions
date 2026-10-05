import { memo } from "react";

import { Icon, List } from "@raycast/api";

import { useBookCover } from "@/hooks/use-book-cover";
import type { BookEntry } from "@/types";

import { BookActionPanel } from "./book-action-panel";
import { BookPreview } from "./book-preview";

interface BookItemProps {
  book: BookEntry;
}

function BookItemF({ book }: BookItemProps) {
  const { path: coverPath, loading } = useBookCover(book.coverUrl, true);

  return (
    <List.Item
      title={book.title}
      icon={{ source: coverPath || Icon.Book, fallback: Icon.Book }}
      actions={<BookActionPanel book={book} />}
      detail={<BookPreview book={book} coverPath={coverPath} loading={loading} />}
    />
  );
}

export const BookItem = memo(BookItemF);
