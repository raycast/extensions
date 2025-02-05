import { showToast, Toast, open, getSelectedFinderItems } from "@raycast/api";

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a JPG file in Finder",
      });
      return;
    }

    const selectedFile = selectedItems[0];
    const filePath = selectedFile.path;

    if (!filePath.toLowerCase().endsWith(".jpg") && !filePath.toLowerCase().endsWith(".jpeg")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a JPG file",
      });
      return;
    }

    const encodedPath = encodeURIComponent(filePath);
    const url = `hipixel://?path=${encodedPath}`;
    await open(url);

    await showToast({
      style: Toast.Style.Success,
      title: "Opened successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open file",
      message: String(error),
    });
  }
}
