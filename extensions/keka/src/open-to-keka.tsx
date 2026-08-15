import { closeMainWindow, getSelectedFinderItems } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { scriptSendFiles } from "./utils/applescript-utils";
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
      await showFailureToast("", { title: "No files selected" });
      return;
    }
    const filePaths = fileSystemItems.map((value) => {
      return value.path;
    });
    await scriptSendFiles(filePaths);
  } catch (e) {
    console.error(String(e));
    await showFailureToast(e, {
      title: e instanceof Error ? e.toString() : "Failed to open",
    });
  }
};
