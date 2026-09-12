import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import path from "path";
import { getSelectedItems } from "universal-selection";
import { isPDFDocumentLocked, watermark } from "swift:../swift";

interface Preferences {
  transparency: string;
  rotation: string;
}

export default async function Command(props: {
  arguments: {
    text: string;
    fontSize?: string;
  };
}) {
  try {
    const { text, fontSize } = props.arguments;
    const preferences = getPreferenceValues<Preferences>();
    const transparency = parseFloat(preferences.transparency);
    const rotation = parseInt(preferences.rotation);

    const selectedItems = await getSelectedItems();

    if (selectedItems.length === 0) {
      throw new Error("No files have been selected");
    }

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
