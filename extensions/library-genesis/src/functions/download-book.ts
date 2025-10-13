import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import type { BookEntry, LibgenPreferences } from "@/types";
import { getUrlFromDownloadPage } from "@/utils/api";
import { downloadBookToDefaultDirectory, downloadBookToLocation } from "@/utils/books";

import Style = Toast.Style;

export const downloadBook = async (book: BookEntry) => {
  const { downloadGateway, alwaysAskWhereToSave } = getPreferenceValues<LibgenPreferences>();

  const toast = await showToast(Style.Animated, "Fetching URL...");
  try {
    const url = await getUrlFromDownloadPage(book.downloadUrl, downloadGateway);
    toast.title = "Using default gateway...";
    switch (alwaysAskWhereToSave) {
      case true:
        downloadBookToLocation(url, book);
        break;
      case false:
        downloadBookToDefaultDirectory(url, book);
        break;
    }
  } catch (err) {
    console.error(err);
    await showHUD("Download Failed. Try with a different download gateway.");
  }
};

export default downloadBook;
