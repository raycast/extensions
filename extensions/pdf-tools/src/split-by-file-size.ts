import {
  closeMainWindow,
  getPreferenceValues,
  getSelectedFinderItems,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { getSelectedItems } from "universal-selection";
import { isMac, isWindows } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SplitByFileSize }>) {
  try {
    const maxSizeMB = parseFloat(props.arguments.maxSizeMB);

    if (isNaN(maxSizeMB) || maxSizeMB <= 0) {
      throw new Error("A positive number is required");
    }

    const selectedItems = isMac ? await getSelectedItems() : await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error("You must select at least one PDF file");
    }

    for (const item of selectedItems) {
      if (path.extname(item.path).toLowerCase() !== ".pdf") {
        throw new Error("Only PDF files should be selected");
      }
    }

    if (isMac) {
      const { isPDFDocumentLocked, splitByFileSize } = await import("swift:../swift");

      for (const item of selectedItems) {
        if (await isPDFDocumentLocked(item.path)) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }
      }

      await closeMainWindow();

      const preferences = getPreferenceValues<Preferences.SplitByFileSize>();
      const suffix = preferences.suffix || undefined;

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Splitting "${path.basename(item.path)}"`,
        });

        await splitByFileSize(item.path, maxSizeMB, suffix);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `PDF file${selectedItems.length > 1 ? "s" : ""} split successfully`,
      });
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF } = await import("@libpdf/core");
      const { splitBySizeWindows } = await import("./lib/windows");
      await closeMainWindow();

      const preferences = getPreferenceValues<Preferences.SplitByFileSize>();
      const suffix = preferences.suffix || "part";
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Splitting "${path.basename(item.path)}"`,
        });

        const pdfBytes = await fs.readFile(item.path);
        const pdf = await PDF.load(new Uint8Array(pdfBytes));

        if (pdf.isEncrypted) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }

        const originalFileName = path.parse(item.path).name;
        const dirPath = path.dirname(item.path);

        await splitBySizeWindows({ pdf, maxSizeBytes, originalFileName, dirPath, suffix });
      }

      await showToast({
        style: Toast.Style.Success,
        title: `PDF file${selectedItems.length > 1 ? "s" : ""} split successfully`,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
