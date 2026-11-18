import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type ClipboardImage = {
  filePath: string;
  cleanupPath?: string;
};

const imageMimeByExtension: Record<string, string> = {
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

const clipboardImageToPngScript = `
ObjC.import("AppKit");

function pngFileType() {
  return $.NSBitmapImageFileTypePNG === undefined ? $.NSPNGFileType : $.NSBitmapImageFileTypePNG;
}

function writeData(data, outputPath) {
  if (!data) {
    return false;
  }

  return data.writeToFileAtomically($(outputPath), true);
}

function convertToPng(data) {
  if (!data) {
    return null;
  }

  const imageRep = $.NSBitmapImageRep.imageRepWithData(data);
  if (!imageRep) {
    return null;
  }

  return imageRep.representationUsingTypeProperties(pngFileType(), $());
}

function run(argv) {
  const outputPath = argv[0];
  const pasteboard = $.NSPasteboard.generalPasteboard;

  const png = pasteboard.dataForType("public.png");
  if (writeData(png, outputPath)) {
    return outputPath;
  }

  const tiff = pasteboard.dataForType("public.tiff");
  if (writeData(convertToPng(tiff), outputPath)) {
    return outputPath;
  }

  const images = pasteboard.readObjectsForClassesOptions($([$.NSImage.class()]), $());
  if (images && images.count > 0) {
    const image = images.objectAtIndex(0);
    if (writeData(convertToPng(image.TIFFRepresentation), outputPath)) {
      return outputPath;
    }
  }

  throw new Error("Clipboard does not contain an image.");
}
`;

export default async function command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uploading image",
  });

  let clipboardImage: ClipboardImage | undefined;

  try {
    clipboardImage = await getClipboardImage();
    const url = await uploadImage(clipboardImage.filePath);

    await Clipboard.copy(url);
    await showHUD("ImgBed URL copied");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "ImgBed upload failed";
    toast.message = formatError(error);
  } finally {
    if (clipboardImage?.cleanupPath) {
      await rm(clipboardImage.cleanupPath, { force: true, recursive: true });
    }
  }
}

async function getClipboardImage(): Promise<ClipboardImage> {
  const clipboard = await Clipboard.read();

  if (clipboard.file) {
    const filePath = normalizeClipboardFilePath(clipboard.file);

    await assertReadableImageFile(filePath);
    return { filePath };
  }

  return await extractRawClipboardImage();
}

function normalizeClipboardFilePath(file: string): string {
  if (file.startsWith("file://")) {
    return fileURLToPath(file);
  }

  return file;
}

async function assertReadableImageFile(filePath: string) {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) {
    throw new Error("Clipboard file is not a regular file.");
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension && !imageMimeByExtension[extension]) {
    throw new Error(`Clipboard file is not a supported image: ${path.basename(filePath)}`);
  }
}

async function extractRawClipboardImage(): Promise<ClipboardImage> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "raycast-imgbed-"));
  const filePath = path.join(tempDir, "clipboard.png");

  try {
    await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", clipboardImageToPngScript, filePath], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    await rm(tempDir, { force: true, recursive: true });
    throw new Error(`No clipboard image found. Copy a screenshot first. ${formatError(error)}`);
  }

  return { filePath, cleanupPath: tempDir };
}

async function uploadImage(filePath: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const uploadUrl = buildUploadUrl(preferences);
  const bytes = new Uint8Array(await readFile(filePath));
  const formData = new FormData();

  formData.append("file", new Blob([bytes], { type: mimeTypeFor(filePath) }), uploadFileNameFor(filePath));

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authCode: preferences.authCode,
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 300)}`);
  }

  return extractImageUrl(responseText);
}

function buildUploadUrl(preferences: Preferences): string {
  const baseUrl = preferences.baseUrl.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("ImgBed Base URL is empty.");
  }

  const url = new URL(`${baseUrl}/upload`);

  url.searchParams.set("uploadChannel", preferences.uploadChannel.trim() || "cfr2");
  url.searchParams.set("returnFormat", "full");
  url.searchParams.set("autoRetry", String(preferences.autoRetry));

  return url.toString();
}

function extractImageUrl(responseText: string): string {
  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`ImgBed returned invalid JSON: ${responseText.slice(0, 300)}`);
  }

  const src = Array.isArray(payload) ? payload[0]?.src : undefined;

  if (typeof src !== "string" || !src) {
    throw new Error(`ImgBed response did not contain .[0].src: ${responseText.slice(0, 300)}`);
  }

  return src;
}

function mimeTypeFor(filePath: string): string {
  return imageMimeByExtension[path.extname(filePath).toLowerCase()] ?? "image/png";
}

function uploadFileNameFor(filePath: string): string {
  const basename = path.basename(filePath);
  const extension = path.extname(basename).toLowerCase();

  if (!extension) {
    return "image.png";
  }

  if (!imageMimeByExtension[extension]) {
    return `${basename}.png`;
  }

  return basename;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
