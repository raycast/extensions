import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
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
  const path = join(homedir(), "Downloads", exportFileName());
  writeFileSync(path, json, "utf8");

  const copied = await copyToClipboard(json);
  const count = `${layers.length} layer${layers.length === 1 ? "" : "s"}`;
  await showHUD(copied ? `Exported ${count}, copied and saved to Downloads` : `Exported ${count} to Downloads`);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.copy(text);
    return (await Clipboard.readText()) === text;
  } catch {
    return false;
  }
}
