import { memo } from "react";

import { Icon, List } from "@raycast/api";

import type { BookEntry } from "@/types";
import type { BookCover } from "@/utils/book-covers";

import { BookActionPanel } from "./book-action-panel";
import { BookPreview } from "./book-preview";

interface BookItemProps {
  id: string;
  book: BookEntry;
  cover: BookCover;
}

function BookItemF({ id, book, cover }: BookItemProps) {
  return (
    <List.Item
      id={id}
      title={book.title}
      icon={{ source: cover.path || Icon.Book, fallback: Icon.Book }}
      actions={<BookActionPanel book={book} />}
      detail={<BookPreview book={book} cover={cover} />}
    />
  );
}

export const BookItem = memo(BookItemF);
