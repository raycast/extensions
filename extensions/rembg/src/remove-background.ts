import {
  showHUD,
  showToast,
  Toast,
  getSelectedFinderItems,
  getPreferenceValues,
  Clipboard,
  showInFinder,
} from "@raycast/api";
import {
  ensureRembg,
  removeBackground,
  getOutputPath,
  isImageFile,
  ProcessingMode,
} from "./utils";

interface Preferences {
  outputSuffix: string;
  copyToClipboard: boolean;
  processingMode: ProcessingMode;
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  // 1. Get selected Finder items
  let selectedItems;
  try {
    selectedItems = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder selection",
      message: "Please select image(s) in Finder first",
    });
    return;
  }

  if (selectedItems.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No files selected",
      message: "Please select image(s) in Finder",
    });
    return;
  }

  const imageFiles = selectedItems.filter((item) => isImageFile(item.path));

  if (imageFiles.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No images found",
      message: "Selected files are not supported image formats",
    });
    return;
  }

  // 2. Ensure rembg is installed (auto-install if needed)
  let pythonPath: string;
  try {
    pythonPath = await ensureRembg();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Setup failed",
      message: String(error),
    });
    return;
  }

  // 3. Process images
  const totalImages = imageFiles.length;
  const plural = totalImages > 1 ? "s" : "";

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Removing background${plural}...`,
    message: `Processing ${totalImages} image${plural} (${prefs.processingMode})`,
  });

  const results: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const outputPath = getOutputPath(file.path, prefs.outputSuffix);

    toast.message = `Processing ${i + 1}/${totalImages}: ${file.path.split("/").pop()}`;

    try {
      const result = await removeBackground(
        file.path,
        outputPath,
        pythonPath,
        prefs.processingMode,
      );
      results.push(result);
    } catch (error) {
      errors.push(`${file.path.split("/").pop()}: ${error}`);
    }
  }

  if (results.length > 0) {
    if (prefs.copyToClipboard && results.length === 1) {
      await Clipboard.copy({ file: results[0] });
    }

    await showInFinder(results[0]);

    toast.style = Toast.Style.Success;
    toast.title = `Done! ${results.length} image${results.length > 1 ? "s" : ""} processed`;
    toast.message = errors.length > 0 ? `${errors.length} error(s)` : undefined;

    await showHUD(`Background removed from ${results.length} image${plural}`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to process images";
    toast.message = errors.join(", ");
  }
}
