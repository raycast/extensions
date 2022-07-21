import { getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { BookEntry, LibgenPreferences } from "../types";
import { getUrlFromDownloadPage } from "../utils/libgen-api";

export const downloadBook = async ({ downloadUrl, title, author, year, extension }: BookEntry) => {
  const fileName = `${author} - ${title}${year && " (" + year + ")"}.${extension.toLowerCase()}`.replace(/\//g, ""); // remove slashes
  const { downloadGateway } = getPreferenceValues<LibgenPreferences>();

  try {
    await showHUD("Please select a location to save the book...");
    const url = await getUrlFromDownloadPage(downloadUrl, downloadGateway);
    console.log(url);

    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${fileName}"
      set q_temp_folder to quoted form of temp_folder
      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);
    await showHUD("Download complete.");
  } catch (err) {
    console.error(err);
    await showHUD("Couldn't download the book...");
  }
};

export default downloadBook;
