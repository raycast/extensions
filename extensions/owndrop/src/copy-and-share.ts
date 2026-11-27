import {
  closeMainWindow,
  Clipboard,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import { dropFileFromPath, dropText } from "./api";
import { copySelectedFiles, copySelectedExplorerFiles } from "./selection-clipboard";

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
      let succeeded = 0;
      for (const [index, file] of files.entries()) {
        await showHUD(`Copied ${files.length} files · Uploading ${index + 1}/${files.length}...`);
        try {
          await dropFileFromPath(file);
          succeeded++;
        } catch {
          // Attempt every selected file, and leave the full local copy intact.
        }
      }
      await showHUD(`Copied ${files.length} files · Dropped ${succeeded} · Failed ${files.length - succeeded}`);
    } else {
      const text = await getSelectedText();
      if (!text.trim()) {
        await showHUD("Select text or files first");
        return;
      }
      await Clipboard.copy(text);
      copied = true;
      await showHUD("Copied locally · Uploading...");
      await dropText(text);
      await showHUD("Copied and dropped");
    }
  } catch {
    if (readingExplorer) {
      await showHUD("Could not read File Explorer selection. Keep Explorer active and retry the hotkey.");
      return;
    }
    await showHUD(copied ? "Copied locally · Drop failed" : "Could not copy selection · Nothing dropped");
  }
}
