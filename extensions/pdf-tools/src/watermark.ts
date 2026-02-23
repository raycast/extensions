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
import { isMac, isWindows } from "./lib/constants";
import { getSelectedItems } from "universal-selection";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Watermark }>) {
  try {
    const { text, fontSize } = props.arguments;
    const preferences = getPreferenceValues<Preferences.Watermark>();
    const transparency = parseFloat(preferences.transparency);
    const rotation = parseInt(preferences.rotation);

    const selectedItems = isMac ? await getSelectedItems() : await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error("No files have been selected");
    }

    // Mac implementation using Swift
    if (isMac) {
      const { isPDFDocumentLocked, watermark } = await import("swift:../swift");
      for (const item of selectedItems) {
        if (path.extname(item.path).toLowerCase() !== ".pdf") {
          throw new Error("Only PDF files should be selected");
        }

        if (await isPDFDocumentLocked(item.path)) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }
      }

      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Watermarking "${path.basename(item.path)}"`,
        });

        await watermark(item.path, text, transparency, rotation, fontSize ? parseInt(fontSize) : undefined);
      }
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF, rgb, Standard14Font, StandardFonts } = await import("@libpdf/core");

      for (const item of selectedItems) {
        if (path.extname(item.path).toLowerCase() !== ".pdf") {
          throw new Error("Only PDF files should be selected");
        }
      }

      await closeMainWindow();

      const finalFontSize = fontSize ? parseInt(fontSize) : 72;

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Watermarking "${path.basename(item.path)}"`,
        });

        const pdfBytes = await fs.readFile(item.path);
        const pdf = await PDF.load(new Uint8Array(pdfBytes));

        if (pdf.isEncrypted) {
          throw new Error(`"${path.basename(item.path)}" is password-protected`);
        }

        const pages = pdf.getPages();

        const font = Standard14Font.of(StandardFonts.HelveticaBold);
        const textWidth = font.widthOfTextAtSize(text, finalFontSize);
        const textHeight = font.heightAtSize(finalFontSize);

        for (const page of pages) {
          const { width, height } = page;

          const centerX = (width - textWidth) / 2;
          const centerY = (height - textHeight) / 2;

          page.drawText(text, {
            x: centerX,
            y: centerY,
            size: finalFontSize,
            font: StandardFonts.HelveticaBold,
            color: rgb(0, 0, 0),
            opacity: transparency,
            rotate: {
              angle: -1 * rotation,
              origin: "center",
            },
          });
        }

        const watermarkedBytes = await pdf.save();
        const originalFileName = path.parse(item.path).name;
        const dirPath = path.dirname(item.path);
        const newFilePath = path.join(dirPath, `${originalFileName} [watermarked].pdf`);

        await fs.writeFile(newFilePath, watermarkedBytes);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: `PDF file${selectedItems.length > 1 ? "s" : ""} watermarked successfully`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
