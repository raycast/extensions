import { closeMainWindow, getSelectedFinderItems, LaunchProps, showToast, Toast } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { getSelectedItems } from "universal-selection";
import { isMac, isWindows } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Merge }>) {
  try {
    const { outputFilename } = props.arguments;

    const selectedItems = isMac ? await getSelectedItems() : await getSelectedFinderItems();

    if (selectedItems.length < 2) {
      throw new Error("You must select at least two PDF files");
    }

    for (const item of selectedItems) {
      if (path.extname(item.path).toLowerCase() !== ".pdf") {
        throw new Error("Only PDF files should be selected");
      }
    }

    //  Mac implementation using Swift
    if (isMac) {
      const { isPDFDocumentLocked, merge } = await import("swift:../swift");

      for (const item of selectedItems) {
        if (await isPDFDocumentLocked(item.path)) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }
      }

      await closeMainWindow();

      await showToast({
        style: Toast.Style.Animated,
        title: "Merging PDF files",
      });

      const pdfFiles = selectedItems.filter((item) => path.extname(item.path).toLowerCase() === ".pdf");

      await merge(
        pdfFiles.map((file) => file.path),
        outputFilename,
      );
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF } = await import("@libpdf/core");
      await closeMainWindow();

      await showToast({
        style: Toast.Style.Animated,
        title: "Merging PDF files",
      });

      const pdfBytesArray: Uint8Array[] = [];
      for (const item of selectedItems) {
        const pdfBytes = await fs.readFile(item.path);
        const pdf = await PDF.load(new Uint8Array(pdfBytes));

        if (pdf.isEncrypted) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }

        pdfBytesArray.push(new Uint8Array(pdfBytes));
      }

      const mergedPdf = await PDF.merge(pdfBytesArray);

      const mergedBytes = await mergedPdf.save();
      const dirPath = path.dirname(selectedItems[0].path);
      const outputPath = path.join(dirPath, `${outputFilename}.pdf`);

      await fs.writeFile(outputPath, mergedBytes);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "PDF files merged successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
