import { showHUD, showToast, Toast } from "@raycast/api";
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

  try {
    const path = join(homedir(), "Downloads", exportFileName());
    writeFileSync(path, layersToJson(layers), "utf8");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not write the export file",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  await showHUD(`Exported ${layers.length} layer${layers.length === 1 ? "" : "s"} to Downloads`);
}
