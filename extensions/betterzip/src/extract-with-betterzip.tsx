import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";
import { scriptExtractArchives } from "./utils/applescript-utils";
import { betterZipInstalled } from "./utils/common-utils";
import { betterZipNotInstallDialog } from "./hooks/hooks";
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
      await showHUD("No archives selected");
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
      await showHUD("No archives selected");
      return;
    }
    await scriptExtractArchives(filePaths);
  } catch (e) {
    console.error(String(e));
    await showHUD(String(e));
  }
};
