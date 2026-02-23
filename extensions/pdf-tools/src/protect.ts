import { closeMainWindow, getSelectedFinderItems, LaunchProps, showToast, Toast } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { getSelectedItems } from "universal-selection";
import { isMac, isWindows } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Protect }>) {
  try {
    const { password } = props.arguments;

    const selectedItems = isMac ? await getSelectedItems() : await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error("No files have been selected");
    }

    for (const item of selectedItems) {
      if (path.extname(item.path).toLowerCase() !== ".pdf") {
        throw new Error("Only PDF files should be selected");
      }
    }

    // Mac implementation using Swift
    if (isMac) {
      const { isPDFDocumentLocked, protect } = await import("swift:../swift");

      for (const item of selectedItems) {
        if (await isPDFDocumentLocked(item.path)) {
          throw new Error(`"${path.basename(item.path)}" is already password-protected`);
        }
      }

      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Protecting "${path.basename(item.path)}"`,
        });

        await protect(item.path, password);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `PDF file${selectedItems.length > 1 ? "s" : ""} protected successfully`,
      });
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF } = await import("@libpdf/core");
      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Protecting "${path.basename(item.path)}"`,
        });

        const pdfBytes = await fs.readFile(item.path);
        const pdf = await PDF.load(new Uint8Array(pdfBytes));

        if (pdf.isEncrypted) {
          throw new Error(`"${path.basename(item.path)}" is already password-protected`);
        }

        pdf.setProtection({
          userPassword: password,
          algorithm: "AES-256",
        });

        const protectedBytes = await pdf.save();
        await fs.writeFile(item.path, protectedBytes);
      }

      await showToast({
        style: Toast.Style.Success,
        title: `PDF file${selectedItems.length > 1 ? "s" : ""} protected successfully`,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
