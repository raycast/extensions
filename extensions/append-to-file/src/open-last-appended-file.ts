import { open, showHUD, showToast, Toast } from "@raycast/api";
import { access } from "node:fs/promises";
import path from "node:path";
import { getLastAppendedFile } from "./lib/append-history";
import { getMruFiles } from "./lib/cache";

export default async function Command() {
  try {
    const lastAppendedFile = await getLastAppendedFile();
    const mruFiles = await getMruFiles();

    const candidates = [lastAppendedFile, ...mruFiles.filter((filePath) => filePath !== lastAppendedFile)].filter(
      (filePath): filePath is string => Boolean(filePath),
    );

    let targetFile: string | undefined;
    for (const filePath of candidates) {
      try {
        await access(filePath);
        targetFile = filePath;
        break;
      } catch {
        // Continue to next candidate.
      }
    }

    if (!targetFile) {
      throw new Error("No accessible appended file found. Append a file first, or check that the file still exists.");
    }

    await open(targetFile);
    await showHUD(`Opened ${path.basename(targetFile)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Open failed.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Open last appended file failed",
      message,
    });
  }
}
