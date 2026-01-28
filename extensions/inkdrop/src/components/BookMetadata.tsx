import { getPreferenceValues, List } from "@raycast/api";
import { getInkdrop, type InkdropOption, type Note } from "../inkdrop";

export const BookMetadata = ({ note }: { note: Note }) => {
  const { useBooks } = getInkdrop(getPreferenceValues<InkdropOption>());
  const { books } = useBooks();

  const book = books?.find((book) => book._id === note.bookId);
  return book !== undefined ? <List.Item.Detail.Metadata.Label title="Notebook" text={book.name} /> : null;
};
