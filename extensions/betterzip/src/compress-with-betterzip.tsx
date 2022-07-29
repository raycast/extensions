import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";
import { scriptArchiveFiles } from "./utils/applescript-utils";
import { betterZipInstalled } from "./utils/common-utils";
import { betterZipNotInstallDialog } from "./hooks/hooks";

export default async () => {
  try {
    if (!betterZipInstalled()) {
      await betterZipNotInstallDialog();
      return;
    }
    await closeMainWindow({ clearRootSearch: false });
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await showHUD("No files selected");
      return;
    }
    const filePaths = fileSystemItems.map((value) => {
      return value.path;
    });
    await scriptArchiveFiles(filePaths);
  } catch (e) {
    console.error(String(e));
    await showHUD(String(e));
  }
};
