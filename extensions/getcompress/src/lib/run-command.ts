import { showToast, Toast } from "@raycast/api";
import {
  buildCompressFilesDeeplink,
  CompressDeeplinkOptions,
  openGetCompressDeeplink,
} from "./deeplink";
import { getSelectedFilePaths } from "./selection";

export async function compressSelectedFiles(
  options: CompressDeeplinkOptions,
): Promise<void> {
  try {
    const filePaths = await getSelectedFilePaths();
    const deeplink = buildCompressFilesDeeplink(filePaths, options);
    await openGetCompressDeeplink(deeplink);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not compress files",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
