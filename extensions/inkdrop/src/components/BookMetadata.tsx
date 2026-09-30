import { List } from "@raycast/api";
import type { Book, Note } from "../inkdrop";

export const BookMetadata = ({ note, books }: { note: Note; books: Book[] | undefined }) => {
  const book = books?.find((book) => book._id === note.bookId);
  return book !== undefined ? <List.Item.Detail.Metadata.Label title="Notebook" text={book.name} /> : null;
};
