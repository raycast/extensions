import { showToast, Toast, getSelectedFinderItems, getPreferenceValues } from "@raycast/api";
import { compressImage, isSupportedImage } from "./utils";
const preferences = getPreferenceValues<Preferences>();

export default async function main() {
  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path).filter((filePath) => isSupportedImage(filePath));
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Compressing images...",
  });

  try {
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "No supported images selected",
      });
      return;
    }

    const results = await Promise.all(filePaths.map((filePath) => compressImage(filePath, preferences)));
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur.originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur.compressedSize, 0);

    const emoji = totalCompressedSize <= totalOriginalSize ? "🎉" : "🤔";
    const f = totalCompressedSize <= totalOriginalSize ? "-" : "+";

    await showToast({
      style: Toast.Style.Success,
      title: `Compression successful ${emoji}`,
      message:
        totalOriginalSize === 0 ? "0%" : `${f}${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`,
    });
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = e instanceof Error ? e.message : "failed to compress images";
  }
}
