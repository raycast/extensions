import { showToast, Toast } from "@raycast/api";
import { buildAddFilesDeeplink, openGetCompressDeeplink } from "./lib/deeplink";
import { getSelectedFilePaths } from "./lib/selection";

export default async function Command() {
  try {
    const filePaths = await getSelectedFilePaths();
    const deeplink = buildAddFilesDeeplink(filePaths);
    await openGetCompressDeeplink(deeplink);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open files",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
