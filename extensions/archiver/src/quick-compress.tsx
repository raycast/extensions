import { getPreferenceValues, getSelectedFinderItems, showToast, Toast, showHUD, showInFinder } from "@raycast/api";
import { compress, ensureBinary } from "./common/utils";
import { ICompressPreferences } from "./common/types";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const preferences: ICompressPreferences = getPreferenceValues<ICompressPreferences>();

  try {
    await ensureBinary();

    const selectedFinderItems = await getSelectedFinderItems();
    if (!selectedFinderItems.length) {
      await showHUD("⚠️ No files selected");
      return;
    }

    const filePaths = selectedFinderItems.map((item) => item.path);
    showToast({ title: "Compressing...", style: Toast.Style.Animated });
    const path = await compress(filePaths, preferences.defaultCompressionFormat);
    await showInFinder(path);
    await showHUD(`🎉 Compressed to ${preferences.defaultCompressionFormat} successfully`);
  } catch (error) {
    showFailureToast(error, { title: "Failed to compress" });
  }
}
