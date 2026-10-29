import type { BookEntry } from "@/types";

export const getBookRows = (books: BookEntry[]) => {
  const occurrences = new Map<string, number>();
  return books.map((book) => {
    const identity = JSON.stringify([book.md5, book.infoUrl, book.downloadUrl, book.extension]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return { id: `${identity}:${occurrence}`, book };
  });
};
