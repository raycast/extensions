import { showToast, Toast, open, getSelectedFinderItems } from "@raycast/api";

// 定义支持的图片格式
const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".heic",
  ".heif",
];

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select an image file in Finder",
      });
      return;
    }

    const selectedFile = selectedItems[0];
    const filePath = selectedFile.path;
    const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf("."));

    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: `Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}`,
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
