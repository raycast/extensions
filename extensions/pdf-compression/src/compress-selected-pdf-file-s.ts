import { showToast, Toast, getSelectedFinderItems, showInFinder, FileSystemItem, LaunchProps } from "@raycast/api";
import { basename, dirname, join, extname } from "path";
import { copyFile, access, constants, rename } from "fs/promises";
import { compressPDF } from "swift:../swift";

interface PDFCompressionResult {
  originalSize: number;
  compressedSize: number;
  compressedURL: string;
  savedPercentage: number;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export default async function main(props: LaunchProps<{ arguments: Arguments.CompressSelectedPdfFileS }>) {
  const { behavior } = props.arguments;
  const isReplace = behavior === "replace";

  // Get selected files in Finder
  let pdfs: FileSystemItem[] = [];

  try {
    const selectedItems = await getSelectedFinderItems();
    if (!selectedItems.length) {
      throw new Error("No PDF selected");
    }

    pdfs = selectedItems.filter((item) => item.path.endsWith(".pdf"));
    if (pdfs.length === 0) {
      throw new Error("No PDF selected");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not get selected PDF files",
      message: String(error).trim().replace("Error: ", ""),
    });
  }

  for (const [index, pdf] of pdfs.entries()) {
    const fileName = basename(pdf.path);
    await showToast({
      style: Toast.Style.Animated,
      title: `Compressing ${fileName}`,
      message: `${index + 1} of ${pdfs.length}`,
    });

    // The new file name will be the original file name with ' - compressed' appended
    const originalDir = dirname(pdf.path);
    const originalBase = basename(pdf.path, extname(pdf.path));
    const newFileName = `${originalBase} - compressed${extname(pdf.path)}`;
    let newFilePath = join(originalDir, newFileName);

    // Check if the file already exists
    if (!isReplace && (await fileExists(newFilePath))) {
      await showToast({
        style: Toast.Style.Failure,
        title: `"${newFileName}" already exists.`,
      });
      continue;
    }

    try {
      // Call the Swift function
      const result = (await compressPDF(pdf.path)) as PDFCompressionResult;
      if (result.savedPercentage === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `No improvement`,
          message: `${fileName} could not be compressed further.`,
        });
        continue;
      }
      // Copy compressed file to the same directory as the original
      await copyFile(result.compressedURL, newFilePath);
      // In replace mode, this overwrites the original PDF.
      if (isReplace) {
        await rename(newFilePath, pdf.path);
        newFilePath = pdf.path;
      }
      await showToast({
        style: Toast.Style.Success,
        title: `Compressed ${fileName}`,
        message: `Saved ${result.savedPercentage}% (${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)})`,
      });
      await showInFinder(newFilePath);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to compress ${fileName}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
