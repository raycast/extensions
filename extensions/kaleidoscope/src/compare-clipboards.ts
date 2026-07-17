import { showToast, Toast, closeMainWindow, open, Clipboard } from "@raycast/api";
import { KALEIDOSCOPE_BUNDLE_ID, checkKaleidoscopeInstallation } from "./utils/checkInstall";
import { URL_SCHEME, SUFFIX } from "./utils/urlScheme";
import { clipboardToFilePath } from "./utils/clipboardToFile";

export default async function main() {
  const application = await checkKaleidoscopeInstallation();

  if (!application) {
    return;
  }

  try {
    const filePaths: string[] = [];
    let clipboardOffset = 0;

    // we need to iteratively read the clipboard content until we find at least two items
    // because sometimes we may receive an empty object as the clipboard content
    while (filePaths.length < 2) {
      console.log(`Reading Clipboard content at offset ${clipboardOffset}`);
      const clipboardContent = await Clipboard.read({ offset: clipboardOffset });
      if (clipboardContent?.file || clipboardContent?.text) {
        const filePath = await clipboardToFilePath(clipboardContent, `${clipboardOffset}c`);
        filePaths.push(filePath);
      }

      if (clipboardOffset === 5) {
        // we were not able to find files in the clipboard for the last 6 items
        // (6 items its the maximum number of items we can read from the clipboard)
        break;
      }

      clipboardOffset++;
      continue;
    }

    if (filePaths.length < 1) {
      console.log("Less than 1 item in filePaths");
      throw new Error("No Clipboard item to compare.");
    }

    let compareUrl = "";

    if (filePaths.length === 1) {
      compareUrl = `${URL_SCHEME}compare?Raycast Clipboard=${encodeURIComponent(filePaths[0])}&${SUFFIX}`;
    } else if (filePaths.length === 2) {
      const now = new Date();
      const compareTime = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      compareUrl = `${URL_SCHEME}compare?label=Raycast Clipboards (${compareTime})&Previous Clipboard=${encodeURIComponent(
        filePaths[1],
      )}&Latest Clipboard=${encodeURIComponent(filePaths[0])}&${SUFFIX}`;
    }

    console.log("Opening Kaleidoscope with URL:", compareUrl);
    await open(compareUrl, KALEIDOSCOPE_BUNDLE_ID);

    closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    console.error("Compare Clipboard failed:", e);
    await showToast({
      style: Toast.Style.Failure,
      title: "Compare Clipboard Failed",
      message: e instanceof Error ? e.message : "Could not read Clipboard",
    });
  }
}
