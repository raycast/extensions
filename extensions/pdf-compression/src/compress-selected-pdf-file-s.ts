import { showToast, Toast, getSelectedFinderItems, showInFinder } from "@raycast/api";
import { basename, dirname, join, extname } from "path";
import { copyFile } from "fs/promises";
import { compressPDF } from "swift:../swift";

export default async function main() {
  // Get selected files in Finder
  const items = await getSelectedFinderItems();
  const pdfs = items.filter((item) => item.path.endsWith(".pdf"));
  if (pdfs.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "No PDF selected" });
    return;
  }

  for (const pdf of pdfs) {
    const fileName = basename(pdf.path);
    await showToast({ style: Toast.Style.Animated, title: `Compressing ${fileName}` });
    try {
      // Call the Swift function
      const result = await compressPDF(pdf.path);
      if (result.savedPercentage === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `No improvement`,
          message: `${fileName} could not be compressed further.`,
        });
        return;
      }
      // Copy compressed file to the same directory as the original, with ' - compressed' appended
      const originalDir = dirname(pdf.path);
      const originalBase = basename(pdf.path, extname(pdf.path));
      const newFileName = `${originalBase} - compressed${extname(pdf.path)}`;
      const newFilePath = join(originalDir, newFileName);
      await copyFile(result.compressedURL, newFilePath);
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
