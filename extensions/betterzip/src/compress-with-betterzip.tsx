import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { scriptArchiveFiles } from "./utils/applescript-utils";
import { betterZipInstalled, betterZipNotInstallDialog } from "./utils/common-utils";

export default async () => {
  try {
    if (!betterZipInstalled()) {
      await betterZipNotInstallDialog();
      return;
    }
    await closeMainWindow({ clearRootSearch: false });
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await showToast({ title: "No files selected", style: Toast.Style.Failure });
      return;
    }
    const filePaths = fileSystemItems.map((value) => {
      return value.path;
    });
    await scriptArchiveFiles(filePaths);
  } catch (e) {
    console.error(String(e));
    await showToast({ title: String(e), style: Toast.Style.Failure });
  }
};
