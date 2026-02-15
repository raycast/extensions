import {
  closeMainWindow,
  openExtensionPreferences,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { appendTextToFile, createAppendOptions } from "./lib/append";
import { getLastAppendedFile } from "./lib/append-history";
import { getMruFiles } from "./lib/cache";
import { readClipboardTextAtOffset } from "./lib/clipboard";
import { getResolvedPreferences } from "./lib/preferences";

export default async function Command() {
  try {
    const preferences = getResolvedPreferences();
    const lastAppendedFile = await getLastAppendedFile();
    const mruFiles = await getMruFiles();
    const targetFile = lastAppendedFile ?? mruFiles[0];

    if (!targetFile) {
      throw new Error(
        "No appended file yet. Use 'Append Text from Clipboard to File' once first.",
      );
    }

    const text = await readClipboardTextAtOffset(0);

    await appendTextToFile(
      targetFile,
      text,
      createAppendOptions(preferences, "raw"),
    );

    await showHUD(
      `Quick appended current clipboard to ${path.basename(targetFile)}`,
    );
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Quick append failed.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Quick append failed",
      message,
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => {
          void openExtensionPreferences();
        },
      },
    });
  }
}
