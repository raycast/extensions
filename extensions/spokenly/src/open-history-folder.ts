import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync, mkdirSync } from "fs";
import { HISTORY_DIR } from "./lib/constants";

export default async function main() {
  try {
    if (!existsSync(HISTORY_DIR)) {
      mkdirSync(HISTORY_DIR, { recursive: true });
    }
    await open(HISTORY_DIR);
    await showHUD("Opening Spokenly history folder");
  } catch (err) {
    await showFailureToast(err, { title: "Could not open folder" });
  }
}
