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
import { stat } from "fs/promises";

export default async function main() {
  const application = await checkKaleidoscopeInstallation();

  if (!application) {
    return;
  }

  try {
    const frontmostApplication = await getFrontmostApplication();
    let targetFile;

    if (frontmostApplication.name === "Finder") {
      const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
      console.log("File selection in Finder: ", filePaths.length);

      if (filePaths.length > 0) {
        targetFile = await validateFile(filePaths[0]);
        if (!targetFile) return;
      }
    }

    if (targetFile == null) {
      console.log(`Reading Clipboard content`);
      const clipboardContent = await Clipboard.read({ offset: 0 });

      if (clipboardContent?.file) {
        const filePath = await clipboardToFilePath(clipboardContent, "0");
        targetFile = await validateFile(filePath);
        if (!targetFile) return;
      }
    }

    if (targetFile == null) {
      throw new Error("No File to open Kaleidoscope File History for.");
    }

    const historyUrl = `${URL_SCHEME}history?label=Raycast File History&${encodeURIComponent(targetFile)}&${SUFFIX}`;

    console.log("Opening Kaleidoscope with URL:", historyUrl);

    await open(historyUrl, KALEIDOSCOPE_BUNDLE_ID);

    closeMainWindow({ clearRootSearch: true });
  } catch (e) {
    console.error("Open Git History failed:", e);

    await showToast({
      style: Toast.Style.Failure,
      title: "Open Git History Failed",
      message: e instanceof Error ? e.message : "Could not get a target file",
    });
  }
}

async function validateFile(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (!stats.isDirectory()) {
      return filePath;
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "File required",
        message: "The Kaleidoscope File History requires a file, not a folder.",
      });
      return null;
    }
  } catch (error) {
    console.log(`Error checking file stats: ${error}`);
    return null;
  }
}
