import { showHUD, showToast, Toast, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { importTimersFromCSV } from "./Timers";

export default async function Command() {
  const { exportDirectory } = getPreferenceValues<ExtensionPreferences>();
  if (!exportDirectory) {
    await showToast({
      title: "Export directory not set",
      message: "Set the export directory in preferences, then export from the store version first",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  // Find the most recent CSV export in the export directory
  let csvFiles: string[];
  try {
    csvFiles = (await readdir(exportDirectory))
      .filter((f) => f.endsWith(".csv") && f.startsWith("projecttimer"))
      .sort()
      .reverse();
  } catch {
    await showHUD("Could not read export directory");
    return;
  }

  if (csvFiles.length === 0) {
    await showHUD("No CSV exports found. Export from the store version first.");
    return;
  }

  const latestFile = join(exportDirectory, csvFiles[0]);
  const toast = await showToast(Toast.Style.Animated, "Importing timers...");

  try {
    const content = await readFile(latestFile, "utf8");
    const count = await importTimersFromCSV(content);
    toast.style = Toast.Style.Success;
    toast.title = `Imported ${count} timer${count !== 1 ? "s" : ""}`;
    toast.message = `From ${csvFiles[0]}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Import failed";
    toast.message = `${error}`;
  }
}
