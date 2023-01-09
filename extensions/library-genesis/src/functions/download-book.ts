import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { BookEntry, LibgenPreferences } from "../types";
import { getUrlFromDownloadPage } from "../utils/libgen-api";
import { downloadBookToDefaultDirectory, downloadBookToLocation } from "../utils/common-utils";
import Style = Toast.Style;

export const downloadBook = async (book: BookEntry) => {
  const { downloadGateway, alwaysAskWhereToSave } = getPreferenceValues<LibgenPreferences>();

  await showToast(Style.Animated, "Fetching URL...");
  try {
    const url = await getUrlFromDownloadPage(book.downloadUrl, downloadGateway);

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
