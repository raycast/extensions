import { showToast, Toast, showHUD, Clipboard } from "@raycast/api";
import { uploadToS3, getS3ErrorMessage } from "./utils/s3";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function getClipboardImage(): Promise<Buffer | null> {
  // 创建临时文件路径
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `clipboard-${Date.now()}.png`);

  try {
    // 使用 pngpaste 或 osascript 获取剪贴板图片
    // 首先尝试使用 osascript (macOS 原生方式)
    const script = `
      set theFile to POSIX file "${tempFile}"
      try
        set imgData to the clipboard as «class PNGf»
        set fileRef to open for access theFile with write permission
        write imgData to fileRef
        close access fileRef
        return "success"
      on error
        try
          set imgData to the clipboard as JPEG picture
          set fileRef to open for access theFile with write permission
          write imgData to fileRef
          close access fileRef
          return "success"
        on error
          return "no image"
        end try
      end try
    `;

    const result = execSync(`osascript -e '${script}'`, {
      encoding: "utf-8",
    }).trim();

    if (result === "no image") {
      return null;
    }

    // 读取临时文件
    if (fs.existsSync(tempFile)) {
      const buffer = fs.readFileSync(tempFile);
      // 清理临时文件
      fs.unlinkSync(tempFile);
      return buffer;
    }

    return null;
  } catch (error) {
    // 清理临时文件
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    console.error("Failed to get clipboard image:", error);
    return null;
  }
}

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking clipboard...",
    });

    // 获取剪贴板图片
    const imageBuffer = await getClipboardImage();

    if (!imageBuffer) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image in clipboard",
        message: "Please copy an image to clipboard first",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Uploading...",
      message: "Uploading clipboard image",
    });

    // 生成文件名（从剪贴板的图片默认使用 PNG 格式）
    const filename = `clipboard-${Date.now()}.png`;

    // 上传到 S3
    const result = await uploadToS3(imageBuffer, filename);

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
