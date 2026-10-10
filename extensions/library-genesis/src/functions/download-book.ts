import { getPreferenceValues } from "@raycast/api";

import type { BookEntry, LibgenPreferences } from "@/types";
import { downloadBookToDefaultDirectory, downloadBookToLocation } from "@/utils/books";

export const downloadBook = async (book: BookEntry) => {
  const { alwaysAskWhereToSave } = getPreferenceValues<LibgenPreferences>();

  if (alwaysAskWhereToSave) {
    await downloadBookToLocation(book.downloadUrl, book);
  } else {
    await downloadBookToDefaultDirectory(book.downloadUrl, book);
  }
};

export default downloadBook;
