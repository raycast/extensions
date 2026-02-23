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

export default async function Command(props: LaunchProps<{ arguments: Arguments.SplitByPageCount }>) {
  try {
    const pageCount = Number(props.arguments.pageCount);
    const preferences = getPreferenceValues<Preferences.SplitByPageCount>();
    const suffix = preferences.suffix || undefined;

    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      throw new Error("A positive integer is required");
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

    // Mac implementation using Swift
    if (isMac) {
      const { isPDFDocumentLocked, splitByPageCount } = await import("swift:../swift");

      for (const item of selectedItems) {
        if (await isPDFDocumentLocked(item.path)) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }
      }

      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Splitting "${path.basename(item.path)}"`,
        });

        await splitByPageCount(item.path, pageCount, suffix);
      }
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF } = await import("@libpdf/core");
      const { splitByPageCountWindows } = await import("./lib/windows");

      await closeMainWindow();

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

        // Split into chunks
        const chunks = await splitByPageCountWindows(pdf, pageCount);

        // Save each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunkBytes = await chunks[i].save();
          const chunkFilePath = path.join(dirPath, `${originalFileName} [${suffix} ${i + 1}].pdf`);
          await fs.writeFile(chunkFilePath, chunkBytes);
        }
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: `PDF file${selectedItems.length > 1 ? "s" : ""} split successfully`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
