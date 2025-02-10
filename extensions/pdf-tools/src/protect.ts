import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import path from "path";
import { isPDFDocumentLocked, protect } from "swift:../swift";

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

      if (await isPDFDocumentLocked(item.path)) {
        throw new Error(`"${path.basename(item.path)}" is already password-protected`);
      }
    }

    await closeMainWindow();

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];

      await showToast({
        style: Toast.Style.Animated,
        title: `Protecting "${path.basename(item.path)}" [file ${i + 1} of ${selectedItems.length}]`,
      });

      await protect(item.path, password);
    }

    await showToast({
      style: Toast.Style.Success,
      title: `PDF file${selectedItems.length > 1 ? "s" : ""} protected successfully`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: error instanceof Error ? error.message : String(error),
    });
  }
}
