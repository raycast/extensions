import { closeMainWindow, getSelectedFinderItems, LaunchProps, showToast, Toast } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { getSelectedItems } from "universal-selection";
import { isMac, isWindows } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Unlock }>) {
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
      const { isPDFDocumentLocked, unlock } = await import("swift:../swift");

      for (const item of selectedItems) {
        if (!(await isPDFDocumentLocked(item.path))) {
          throw new Error(`"${path.basename(item.path)}" is not password-protected`);
        }
      }

      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Unlocking "${path.basename(item.path)}"`,
        });

        await unlock(item.path, password);
      }
    }

    // Windows implementation using @libpdf/core
    if (isWindows) {
      const { PDF } = await import("@libpdf/core");

      await closeMainWindow();

      for (const item of selectedItems) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Unlocking "${path.basename(item.path)}"`,
        });

        const pdfBytes = await fs.readFile(item.path);

        const pdf = await PDF.load(new Uint8Array(pdfBytes), {
          credentials: password,
        });

        if (!pdf.isEncrypted) {
          throw new Error(`"${path.basename(item.path)}" is not password-protected`);
        }

        if (!pdf.isAuthenticated) {
          throw new Error(`Failed to unlock "${path.basename(item.path)}". Check if the password is correct.`);
        }

        pdf.removeProtection();

        const unlockedBytes = await pdf.save();
        await fs.writeFile(item.path, unlockedBytes);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: `PDF file${selectedItems.length > 1 ? "s" : ""} unlocked successfully`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
