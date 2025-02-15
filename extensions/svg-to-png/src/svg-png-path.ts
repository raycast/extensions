import {
  Clipboard,
  getSelectedFinderItems,
  Toast,
  showToast,
  FileSystemItem,
  getPreferenceValues,
  open,
  popToRoot,
} from "@raycast/api";
import { convertSvgToPng, convertSvgToPngTemp } from "./utils/svg-converter";
import path from "path";
import { existsSync } from "fs";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  let finderClipboardContent;
  let selectedFinderItems: FileSystemItem[] = [];
  try {
    selectedFinderItems = await getSelectedFinderItems();
  } catch (error) {
    try {
      const clipboardContent = await Clipboard.read();
      if (clipboardContent) {
        finderClipboardContent = clipboardContent;
      }
    } catch (error) {
      showFailureToast(error);
    }
  }

  if (selectedFinderItems.length > 0) {
    // only grab the first item
    const item = selectedFinderItems[0];
    const outputPath = path.join(
      getPreferenceValues().defaultOutputPath,
      `${path.basename(item.path, ".svg")}-${getPreferenceValues().defaultScale}x.png`,
    );
    await convertSvgToPng(item.path, outputPath, getPreferenceValues().defaultScale);

    const fileContent: Clipboard.Content = { file: outputPath };
    await Clipboard.copy(fileContent);
    await showToast({
      title: "PNG file copied to clipboard",
      message: `PNG file has been copied to clipboard`,
    });

    if (getPreferenceValues().defaultOpenAfterConversion) {
      await open(outputPath);
    }
    popToRoot();
    return;
  } else if (finderClipboardContent) {
    const item = finderClipboardContent;
    let file;
    try {
      if (!item?.file) {
        throw new Error("No file found in clipboard or selected in Finder");
      }
      file = decodeURIComponent((item?.file as string).replace("file://", ""));
    } catch (error) {
      console.error(`Error processing file: ${error}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Could not process file: ${error}`,
      });
      return;
    }

    try {
      if (!existsSync(file)) {
        throw new Error(`Input file not found: ${file}`);
      }

      // Get temporary file path
      const tempFilePath = await convertSvgToPngTemp(file, getPreferenceValues().defaultScale);

      // Copy to clipboard
      await Clipboard.copy({ file: tempFilePath });

      await showToast({
        title: "PNG copied to clipboard",
        message: "PNG has been copied to clipboard",
      });

      popToRoot();
    } catch (error) {
      console.error(`Error processing file: ${error}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Could not process file: ${error}`,
      });
    }
  }
}
