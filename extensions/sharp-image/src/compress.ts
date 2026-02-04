import { getSelectedFinderItems, showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { compressOriginal, formatBytes, isImageFile, processImages, summarizeResults } from "./utils/image";
import { loadStoredSettings } from "./utils/preferences";

export default async function Command() {
  await loadStoredSettings();

  try {
    const items = await getSelectedFinderItems();
    const imagePaths = items.map((item) => item.path).filter(isImageFile);

    if (imagePaths.length === 0) {
      await showHUD("❌ No image files selected");
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Compressing",
      message: `Processing ${imagePaths.length} file(s)...`,
    });

    const results = await processImages(imagePaths, compressOriginal);
    const summary = summarizeResults(results);

    if (summary.failed === 0) {
      const saved = summary.savedBytes > 0 ? `, saved ${formatBytes(summary.savedBytes)}` : "";
      await showHUD(`✅ ${summary.success} image(s) compressed${saved}`);
    } else if (summary.success > 0) {
      const failedResult = results.find((r) => !r.success);
      if (failedResult?.error) {
        await Clipboard.copy(failedResult.error);
      }
      await showHUD(`⚠️ ${summary.success} succeeded, ${summary.failed} failed (error copied)`);
    } else {
      const failedResult = results.find((r) => !r.success);
      if (failedResult?.error) {
        await Clipboard.copy(failedResult.error);
        await showHUD(`❌ Failed: ${failedResult.error.slice(0, 50)}... (full error copied)`);
      } else {
        await showHUD("❌ Compression failed");
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await Clipboard.copy(error);
    await showHUD(`❌ Error: ${error.slice(0, 50)}... (copied)`);
  }
}
