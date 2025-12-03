import { Clipboard, showToast, Toast, showHUD, open } from "@raycast/api";
import {
  uploadObject,
  getPublicUrl,
  getPresignedUrl,
  getContentType,
  generateFileName,
} from "./lib/r2-client";
import * as fs from "fs";
import * as path from "path";

const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".bmp",
];

function normalizeFilePath(filePath: string): string {
  let normalized = filePath;
  if (normalized.startsWith("file://")) {
    normalized = normalized.slice(7);
  }
  return decodeURIComponent(normalized);
}

function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return true;
  return IMAGE_EXTENSIONS.includes(ext);
}

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading clipboard...",
  });

  try {
    const { file } = await Clipboard.read();

    if (!file) {
      toast.style = Toast.Style.Failure;
      toast.title = "No image in clipboard";
      toast.message = "Please copy an image first";
      return;
    }

    const filePath = normalizeFilePath(file);

    if (!fs.existsSync(filePath)) {
      toast.style = Toast.Style.Failure;
      toast.title = "File not found";
      toast.message = filePath;
      return;
    }

    if (!isImageFile(filePath)) {
      toast.style = Toast.Style.Failure;
      toast.title = "Not an image file";
      toast.message = path.basename(filePath);
      return;
    }

    toast.title = "Uploading...";
    const content = fs.readFileSync(filePath);
    const fileName = generateFileName(filePath);
    const contentType = getContentType(fileName);
    await uploadObject(fileName, content, contentType);

    const publicUrl = getPublicUrl(fileName);
    const finalUrl = publicUrl || (await getPresignedUrl(fileName));

    await Clipboard.copy(finalUrl);
    await open("raycast://confetti");
    await showHUD("Uploaded & URL copied 🎉");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Upload failed";
    toast.message = String(error);
  }
}
