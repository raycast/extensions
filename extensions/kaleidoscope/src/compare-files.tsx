import {
  showToast,
  Toast,
  getSelectedFinderItems,
  closeMainWindow,
  open,
  getFrontmostApplication,
  Clipboard,
} from "@raycast/api";
import { KALEIDOSCOPE_BUNDLE_ID, checkKaleidoscopeInstallation } from "./utils/checkInstall";
import { URL_SCHEME, SUFFIX } from "./utils/urlScheme";
import { clipboardToFilePath } from "./utils/clipboardToFile";

export default async function main() {
  const application = await checkKaleidoscopeInstallation();

  if (!application) {
    return;
  }

  try {
    const frontmostApplication = await getFrontmostApplication();
    const filesToCompare: string[] = [];

    if (frontmostApplication.name === "Finder") {
      const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
      console.log("File selection in Finder: ", filePaths.length);
      // only pick the first two files
      filesToCompare.push(...filePaths);
    } else {
      let clipboardOffset = 0;
      while (filesToCompare.length < 6) {
        console.log(`Reading Clipboard content at offset ${clipboardOffset}`);
        const clipboardContent = await Clipboard.read({ offset: clipboardOffset });

        if (clipboardContent?.file) {
          const filePath = await clipboardToFilePath(clipboardContent, `${clipboardOffset + 1}f`);

          const fileExists = filesToCompare.find((f) => f === filePath);

          if (!fileExists) {
            filesToCompare.push(filePath);
          }
        }

        if (clipboardOffset === 5) {
          // we were not able to find files in the clipboard for the last 6 items
          // (6 items its the maximum number of items we can read from the clipboard)
          break;
        }

        clipboardOffset++;
        continue;
      }
    }

    if (filesToCompare.length < 1) {
      throw new Error("No file found to compare.");
    }

    const compareUrl = `${URL_SCHEME}compare?label=Raycast Files&${filesToCompare
      .map((file) => encodeURIComponent(file))
      .join("&")}&${SUFFIX}`;

    console.log("Opening Kaleidoscope with URL:", compareUrl);

    await open(compareUrl, KALEIDOSCOPE_BUNDLE_ID);

    closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    console.error("Compare Files failed", e);

    await showToast({
      style: Toast.Style.Failure,
      title: "Compare Files Failed",
      message: e instanceof Error ? e.message : "Could not get the two files to compare",
    });
  }
}
