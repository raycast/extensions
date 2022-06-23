import { closeMainWindow, getSelectedFinderItems, open, showHUD } from "@raycast/api";
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
    fileSystemItems.forEach((value) => {
      open(value.path, "BetterZip");
    });
  } catch (e) {
    console.error(String(e));
    await showHUD(String(e));
  }
};
