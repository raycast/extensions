import {
  showToast,
  Toast,
  showHUD,
  Clipboard,
  getSelectedFinderItems,
} from "@raycast/api";
import { uploadToS3, isImageFile, getS3ErrorMessage } from "./utils/s3";
import * as fs from "fs";
import * as path from "path";

export default async function Command() {
  try {
    // 获取 Finder 中选中的文件
    let selectedItems;
    try {
      selectedItems = await getSelectedFinderItems();
    } catch (finderError) {
      // Finder 不在前台时的友好提示
      await showToast({
        style: Toast.Style.Failure,
        title: "Please open Finder first",
        message: "Select an image in Finder, then run this command",
      });
      return;
    }

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select an image file in Finder",
      });
      return;
    }

    // 过滤出图片文件
    const imageFiles = selectedItems.filter((item) => isImageFile(item.path));

    if (imageFiles.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image selected",
        message: "Please select a valid image file (PNG, JPG, GIF, WebP, etc.)",
      });
      return;
    }

    // 只处理第一个图片文件
    const imageFile = imageFiles[0];
    const filename = path.basename(imageFile.path);

    await showToast({
      style: Toast.Style.Animated,
      title: "Uploading...",
      message: filename,
    });

    // 读取文件内容
    const buffer = fs.readFileSync(imageFile.path);

    // 上传到 S3
    const result = await uploadToS3(buffer, filename);

    // 复制 URL 到剪贴板
    await Clipboard.copy(result.url);

    await showHUD(`✅ Uploaded! URL copied to clipboard`);
  } catch (error) {
    console.error("Upload error:", error);

    const { title, message } = getS3ErrorMessage(error);

    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }
}
