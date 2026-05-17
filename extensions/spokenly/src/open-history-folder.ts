import { showHUD, showToast, Toast } from "@raycast/api";
import { execa } from "execa";
import { existsSync, mkdirSync } from "fs";
import { HISTORY_DIR } from "./lib/constants";

export default async function main() {
  try {
    if (!existsSync(HISTORY_DIR)) {
      mkdirSync(HISTORY_DIR, { recursive: true });
    }
    await execa("open", [HISTORY_DIR]);
    await showHUD("Opening Spokenly history folder");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open folder",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
