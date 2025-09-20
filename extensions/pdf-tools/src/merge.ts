import { closeMainWindow, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import path from "path";
import { isPDFDocumentLocked, merge } from "swift:../swift";

export default async function Command(props: { arguments: { outputFilename: string } }) {
  try {
    const { outputFilename } = props.arguments;

    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length < 2) {
      throw new Error("You must select at least two PDF files in Finder");
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

    await showToast({
      style: Toast.Style.Animated,
      title: "Merging PDF files",
    });

    const pdfFiles = selectedItems.filter((item) => path.extname(item.path).toLowerCase() === ".pdf");

    await merge(
      pdfFiles.map((file) => file.path),
      outputFilename,
    );

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
