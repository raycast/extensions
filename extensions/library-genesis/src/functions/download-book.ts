import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { BookEntry, LibgenPreferences } from "../types";
import { getUrlFromDownloadPage } from "../utils/libgen-api";
import { downloadBookToDefaultDirectory, downloadBookToLocation } from "../utils/common-utils";
import Style = Toast.Style;

export const downloadBook = async ({ downloadUrl, title, author, year, extension }: BookEntry) => {
  const { downloadGateway, alwaysAskWhereToSave } = getPreferenceValues<LibgenPreferences>();
  const fileName = `${author} - ${title}${year && " (" + year + ")"}`.replace(/\//g, ""); // remove slashes
  const fileNameWithExtension = `${author} - ${title}${year && " (" + year + ")"}.${extension.toLowerCase()}`.replace(
    /\//g,
    ""
  ); // remove slashes
  await showToast(Style.Animated, "Fetching URL...");
  try {
    const url = await getUrlFromDownloadPage(downloadUrl, downloadGateway);

    if (alwaysAskWhereToSave) {
      downloadBookToLocation(url, fileNameWithExtension);
    } else {
      downloadBookToDefaultDirectory(url, extension, fileName);
    }
  } catch (err) {
    console.error(err);
    await showHUD("Download Failed. Try with a different download gateway.");
  }
};

export default downloadBook;
