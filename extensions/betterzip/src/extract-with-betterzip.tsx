import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { scriptExtractArchives } from "./utils/applescript-utils";
import { betterZipInstalled, betterZipNotInstallDialog } from "./utils/common-utils";
import path from "path";
import { archiveFormat } from "./utils/constants";

export default async () => {
  try {
    if (!betterZipInstalled()) {
      await betterZipNotInstallDialog();
      return;
    }
    await closeMainWindow({ clearRootSearch: false });
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await showToast({ title: "No archives selected", style: Toast.Style.Failure });
      return;
    }
    const filePaths: string[] = [];
    fileSystemItems.forEach((value) => {
      const extname = path.extname(value.path);
      if (archiveFormat.includes(extname)) {
        filePaths.push(value.path);
      }
    });
    if (filePaths.length === 0) {
      await showToast({ title: "No archives selected", style: Toast.Style.Failure });
      return;
    }
    await scriptExtractArchives(filePaths);
  } catch (e) {
    console.error(String(e));
    await showToast({ title: String(e), style: Toast.Style.Failure });
  }
};
