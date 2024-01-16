import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { homedir } from "os";
import path from "path";
/**
 * Gets the selected Finder window.
 * @throws — An error when Finder is not the frontmost application.
 * @returns A Promise that resolves with the selected Finder window's path.
 */

export default async function Command(props: {
  arguments: { fileName: string; deleteOriginalFiles: string };
}) {
  const { fileName, deleteOriginalFiles } = props.arguments;

  try {
    const selectedFinderItems = await getSelectedFinderItems();

    const pdfFiles = selectedFinderItems.filter(
      (item) => path.extname(item.path).toLowerCase() === ".pdf",
    );
    const nonPdfFiles = selectedFinderItems.filter(
      (item) => path.extname(item.path).toLowerCase() !== ".pdf",
    );
    if (nonPdfFiles.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          nonPdfFiles.length +
          " non-PDF files selected :" +
          nonPdfFiles.map((item) => path.basename(item.path)).join(", ") +
          ". Please select only PDF files.",
      });
      return;
    }

    if (pdfFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No PDF files selected",
      });
      return;
    }

    const mergedPdfBytes = await mergePdfs(pdfFiles.map((item) => item.path));
    const outputPath = getOutputPath(
      pdfFiles.map((item) => item.path),
      deleteOriginalFiles,
      fileName,
    );
    fs.writeFileSync(outputPath, mergedPdfBytes);

    await showToast({
      title: "PDFs merged successfully!",
      message: `Saved to ${outputPath}`,
    });
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: String(error),
    });
  }
}

async function mergePdfs(filePaths: string[]): Promise<Uint8Array> {
  // Create a new PDFDocument
  const mergedPdf = await PDFDocument.create();

  // Loop through all file paths and merge them into the new document
  for (const filePath of filePaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  // Serialize the PDFDocument to bytes
  return mergedPdf.save();
}

function getOutputPath(
  filePaths: string[],
  deleteOriginalFiles: string,
  fileName: string,
): string {
  let finalFileName = "merged";

  if (filePaths.length === 0) {
    return path.join(homedir(), "Downloads", finalFileName + ".pdf");
  }

  if (fileName) {
    finalFileName = fileName;
  }

  const firstFilePath = filePaths[0];
  const firstDirPath = path.dirname(firstFilePath);

  // Check if all files are in the same directory
  const sameDirectory = filePaths.every(
    (filePath) => path.dirname(filePath) === firstDirPath,
  );

  if (deleteOriginalFiles == "") {
    // Delete original files
    for (const filePath of filePaths) {
      fs.unlinkSync(filePath);
    }
  }
  if (sameDirectory) {
    return path.join(firstDirPath, finalFileName + ".pdf");
  } else {
    return path.join(homedir(), "Downloads", finalFileName + ".pdf");
  }
}
