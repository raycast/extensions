import { getPreferenceValues, getSelectedFinderItems, showInFinder, showToast, Toast } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { compressFiles, compressSummary, partialCompress } from "./lib/logic";
import { client, showError } from "./lib/raycast";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Compressing with KovaPDF" });
  try {
    const items = await getSelectedFinderItems().catch(() => []);
    const { level } = getPreferenceValues<Preferences.CompressPdf>();
    const saved = await compressFiles(
      client(),
      { exists: existsSync, write: (p, d) => writeFile(p, d, { flag: "wx" }) },
      items.map((i) => i.path),
      level || "basic",
      (i, n) => {
        if (n > 1) toast.message = `${i + 1} of ${n}`;
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Compressed";
    toast.message = compressSummary(saved);
    toast.primaryAction = { title: "Show in Finder", onAction: () => void showInFinder(saved[0]!.path) };
  } catch (err) {
    await showError(err, toast);
    // Some PDFs may already be saved: say which, so nobody redoes them.
    const partial = partialCompress(err);
    if (partial) {
      toast.title = partial.title;
      toast.message = partial.message;
      toast.primaryAction = { title: "Show in Finder", onAction: () => void showInFinder(partial.firstSaved) };
    }
  }
}
