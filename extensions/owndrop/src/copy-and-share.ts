import path from "node:path";
import {
  closeMainWindow,
  Clipboard,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { containsSetupCredential, dropFileFromPath, dropText, normalizeLocalPath } from "./api";
import { copySelectedFiles, copySelectedExplorerFiles } from "./selection-clipboard";

function uploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (containsSetupCredential(message)) return "Check your OwnDrop connection details.";
  const localPath = (error as NodeJS.ErrnoException | undefined)?.path;
  return (localPath ? message.replaceAll(localPath, path.basename(localPath)) : message) || "Unknown upload error.";
}

export default async function Command() {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    await showHUD("Copy & Drop requires macOS or Windows");
    return;
  }
  let copied = false;
  let readingExplorer = false;
  try {
    const app = await getFrontmostApplication();
    const explorer = process.platform === "win32" && /(?:^|[\\/])explorer\.exe$/i.test(app.path);
    if (explorer) await closeMainWindow();
    // Acknowledge before starting the native helper, regardless of selection size.
    // The helper still validates the actual foreground window and active tab.
    await showHUD("Copy & Drop: Copying selection...");
    if (app.bundleId === "com.apple.finder" || explorer) {
      // Never query a background Finder selection or fall back to clipboard contents.
      readingExplorer = explorer;
      const files = explorer
        ? await copySelectedExplorerFiles()
        : (await getSelectedFinderItems()).map((item) => item.path);
      readingExplorer = false;
      if (!files.length) {
        await showHUD("Select files in Finder or File Explorer first");
        return;
      }
      if (!explorer) await copySelectedFiles(files);
      copied = true;
      const failures: string[] = [];
      for (const [index, file] of files.entries()) {
        await showHUD(`Copied ${files.length} files · Uploading ${index + 1}/${files.length}...`);
        try {
          await dropFileFromPath(file);
        } catch (error) {
          const name = path.basename(normalizeLocalPath(file));
          failures.push(`${name}: ${uploadErrorMessage(error)}`);
        }
      }
      if (failures.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Copied locally · Dropped ${files.length - failures.length} of ${files.length}`,
          message: failures.join("\n"),
        });
      } else {
        await showHUD(`Copied and dropped ${files.length} ${files.length === 1 ? "file" : "files"}`);
      }
    } else {
      const text = await getSelectedText();
      if (!text.trim()) {
        await showHUD("Select text or files first");
        return;
      }
      if (containsSetupCredential(text)) {
        await Clipboard.copy(text, { concealed: true });
        await showHUD("Copied privately · Paste into OwnDrop preferences");
        return;
      }
      await Clipboard.copy(text);
      copied = true;
      await showHUD("Copied locally · Uploading...");
      await dropText(text);
      await showHUD("Copied and dropped");
    }
  } catch (error) {
    if (readingExplorer) {
      await showHUD("Could not read File Explorer selection. Keep Explorer active and retry the hotkey.");
      return;
    }
    if (copied) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copied locally · Drop failed",
        message: uploadErrorMessage(error),
      });
    } else {
      await showHUD("Could not copy selection · Nothing dropped");
    }
  }
}
