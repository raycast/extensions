import { closeMainWindow, getPreferenceValues, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import path from "path";
import { isPDFDocumentLocked, splitByPageCount } from "swift:../swift";

interface Preferences {
  suffix: string;
}

export default async function Command(props: { arguments: { pageCount: string } }) {
  try {
    const pageCount = Number(props.arguments.pageCount);

    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      throw new Error("A positive integer is required");
    }

    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      throw new Error("You must select at least one PDF file in Finder");
    }

    for (const item of selectedItems) {
      if (path.extname(item.path).toLowerCase() !== ".pdf") {
        throw new Error("Only PDF files should be selected in Finder");
      }

      if (await isPDFDocumentLocked(item.path)) {
        throw new Error(`"${path.basename(item.path)}" is password-protected`);
      }
    }

    await closeMainWindow();

    const preferences = getPreferenceValues<Preferences>();
    const suffix = preferences.suffix || undefined;

    for (const item of selectedItems) {
      await showToast({
        style: Toast.Style.Animated,
        title: `Splitting "${path.basename(item.path)}"`,
      });

      await splitByPageCount(item.path, pageCount, suffix);
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
