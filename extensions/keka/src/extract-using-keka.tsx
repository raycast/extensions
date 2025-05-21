import {
  closeMainWindow,
  getSelectedFinderItems,
  showToast,
  Toast,
} from "@raycast/api";
import { scriptExtractFiles } from "./utils/applescript-utils";
import { kekaInstalled, kekaNotInstallDialog } from "./utils/common-utils";

export default async () => {
  try {
    if (!kekaInstalled()) {
      await kekaNotInstallDialog();
      return;
    }
    await closeMainWindow({ clearRootSearch: false });
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await showToast({
        title: "No files selected",
        style: Toast.Style.Failure,
      });
      return;
    }
    const filePaths = fileSystemItems.map((value) => {
      return value.path;
    });
    await scriptExtractFiles(filePaths);
  } catch (e) {
    console.error(String(e));
    await showToast({ title: String(e), style: Toast.Style.Failure });
  }
};
