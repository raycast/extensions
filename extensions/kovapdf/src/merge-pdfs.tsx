import { getSelectedFinderItems, showInFinder, showToast, Toast } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ATTRIBUTION, mergeFiles } from "./lib/logic";
import { client, showError } from "./lib/raycast";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Merging with KovaPDF" });
  try {
    const items = await getSelectedFinderItems().catch(() => []);
    const saved = await mergeFiles(
      client(),
      { exists: existsSync, write: (p, d) => writeFile(p, d, { flag: "wx" }) },
      items.map((i) => i.path),
    );
    toast.style = Toast.Style.Success;
    toast.title = "Merged";
    toast.message = `Saved ${path.basename(saved.path)}. ${ATTRIBUTION}`;
    toast.primaryAction = { title: "Show in Finder", onAction: () => void showInFinder(saved.path) };
  } catch (err) {
    await showError(err, toast);
  }
}
