import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import path from "path";
import { isPDFDocumentLocked, unlock } from "swift:../swift";

export default async function Command(props: { arguments: { password: string } }) {
  try {
    const { password } = props.arguments;

    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error("No files have been selected in Finder");
    }

    for (const item of selectedItems) {
      if (path.extname(item.path).toLowerCase() !== ".pdf") {
        throw new Error("Only PDF files should be selected in Finder");
      }

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
