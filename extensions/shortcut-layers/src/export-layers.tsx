import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadLayers } from "./data";
import { exportFileName, layersToJson } from "./transfer";

export default async function Command() {
  const layers = await loadLayers();
  if (layers.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No layers to export" });
    return;
  }

  const json = layersToJson(layers);
  const { copyToClipboard } = getPreferenceValues<Preferences.ExportLayers>();

  const saved = writeExport(json);
  // Copy when asked, and always when the file could not be written.
  const copied = (copyToClipboard || !saved) && (await copyExport(json));

  if (!saved && !copied) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: "Could not write the file or copy to the clipboard",
    });
    return;
  }

  const count = `${layers.length} layer${layers.length === 1 ? "" : "s"}`;
  const where = [saved ? "saved to Downloads" : null, copied ? "copied" : null].filter(Boolean).join(", ");
  await showHUD(`Exported ${count} (${where})`);
}

function writeExport(json: string): boolean {
  try {
    writeFileSync(join(homedir(), "Downloads", exportFileName()), json, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function copyExport(json: string): Promise<boolean> {
  try {
    await Clipboard.copy(json);
    return true;
  } catch {
    return false;
  }
}
