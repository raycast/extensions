import { showHUD, showToast, Toast } from "@raycast/api";
import { execa } from "execa";
import { RECORDINGS_DIR } from "./lib/constants";

export default async function main() {
  try {
    await execa("open", [RECORDINGS_DIR]);
    await showHUD("Opening recordings folder");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open folder",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
