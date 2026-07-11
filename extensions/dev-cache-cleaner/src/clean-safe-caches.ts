import { Alert, confirmAlert, showHUD, showToast, Toast } from "@raycast/api";
import { scanAll } from "./scanners";
import { cleanAllSafe } from "./utils/cleaner";
import { formatBytes } from "./utils/disk";

export default async function CleanSafeCaches() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning caches..." });

  try {
    const results = await scanAll((step) => {
      toast.message = step;
    });

    const safeResults = results.filter((r) => r.risk === "safe" && r.available && r.size > 0);
    if (safeResults.length === 0) {
      await showHUD("No safe caches to clean");
      return;
    }

    const totalSafe = safeResults.reduce((sum, r) => sum + r.size, 0);
    toast.hide();

    // Show confirmation with summary of what will be cleaned
    const itemList = safeResults
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map((r) => `• ${r.title} (${formatBytes(r.size)})`)
      .join("\n");
    const extra = safeResults.length > 10 ? `\n... and ${safeResults.length - 10} more items` : "";

    const confirmed = await confirmAlert({
      title: `Clean ${safeResults.length} Safe Caches?`,
      message: `This will free ${formatBytes(totalSafe)}:\n\n${itemList}${extra}\n\nAll items are safe to remove — tools re-download them automatically on next use.`,
      primaryAction: {
        title: `Clean ${formatBytes(totalSafe)}`,
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning safe caches...",
      message: `${safeResults.length} items`,
    });

    const freed = await cleanAllSafe(results);

    await showHUD(`Freed ${formatBytes(freed)} from ${safeResults.length} caches`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clean failed",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
