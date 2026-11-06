import { homedir } from "os";
import { failToast } from "@chrismessina/raycast-kit";
import { Clipboard, showInFinder, showToast, Toast } from "@raycast/api";
import { describeImportSummary, exportSettingsToFile, importSettingsFromFile } from "../yaml-settings";

/**
 * A path for display, with the home folder shortened to ~
 */
export function displayPath(filePath: string): string {
  return filePath.replace(homedir(), "~");
}

/**
 * Export with a progress toast that ends in Show in Finder and Copy Path, or Copy Error
 */
export async function exportWithToast(): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting apps…" });
  try {
    const filePath = await exportSettingsToFile();
    toast.style = Toast.Style.Success;
    toast.title = "Apps Exported";
    toast.message = displayPath(filePath);
    toast.primaryAction = {
      title: "Show in Finder",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => showInFinder(filePath),
    };
    toast.secondaryAction = {
      title: "Copy Path",
      shortcut: { modifiers: ["cmd"], key: "c" },
      onAction: async (current) => {
        await Clipboard.copy(filePath);
        current.message = "Path copied to clipboard";
      },
    };
  } catch (error) {
    failToast(toast, error, { title: "Export Failed" });
  }
}

/**
 * Import a YAML file with a progress toast that ends in a summary of what changed
 * @returns true when everything in the file was imported
 */
export async function importWithToast(filePath: string): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Importing apps…" });
  try {
    const summary = await importSettingsFromFile(filePath);
    const message = describeImportSummary(summary);
    if (summary.appsFailed > 0) {
      failToast(toast, summary.firstError, { title: "Imported with Problems", message, copyContext: message });
      return false;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Import Complete";
    toast.message = message;
    return true;
  } catch (error) {
    failToast(toast, error, { title: "Import Failed", copyContext: filePath });
    return false;
  }
}
