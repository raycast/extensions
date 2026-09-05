import { Clipboard, Toast, showInFinder, showToast } from "@raycast/api";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readCachedIndex, rebuildIndex } from "./lib/cache";
import { getConfig } from "./lib/config";
import { buildExport, saveSnapshot } from "./lib/exportImport";
import { errorMessage, pluralize } from "./lib/util";

export default async function Command() {
  const config = getConfig();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting repository list…" });
  try {
    // Always rescan so the export reflects reality, not a stale cache.
    toast.message = "Scanning repositories…";
    const index = await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol, {
      reuseSizesFrom: readCachedIndex(config.root),
    });
    const exportFile = buildExport(index);
    const json = JSON.stringify(exportFile, null, 2) + "\n";

    const date = new Date().toISOString().slice(0, 10);
    const target = path.join(os.homedir(), "Downloads", `reponizer-repos-${date}.json`);
    await fs.writeFile(target, json);
    await Clipboard.copy(json);
    await saveSnapshot(exportFile);

    toast.style = Toast.Style.Success;
    toast.title = `Exported ${pluralize(exportFile.repos.length, "repo")}`;
    toast.message = "Saved to Downloads, copied to clipboard, and stored as Raycast snapshot.";
    toast.primaryAction = {
      title: "Show in Finder",
      onAction: () => showInFinder(target),
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = errorMessage(error);
  }
}
