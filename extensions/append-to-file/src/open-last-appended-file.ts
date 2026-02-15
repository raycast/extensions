import { open, showHUD, showToast, Toast } from "@raycast/api";
import { access } from "node:fs/promises";
import path from "node:path";
import { getLastAppendedFile } from "./lib/append-history";

export default async function Command() {
  try {
    const filePath = await getLastAppendedFile();
    if (!filePath) {
      throw new Error("No appended file yet. Append to a file first.");
    }

    await access(filePath);
    await open(filePath);
    await showHUD(`Opened ${path.basename(filePath)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Open failed.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Open last appended file failed",
      message,
    });
  }
}
