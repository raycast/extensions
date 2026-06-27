import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ImageSourceMode } from "./preferences";

const execFileAsync = promisify(execFile);

const API_SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const CONVERTIBLE_MIME_TYPES = new Set([
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/bmp",
]);
const KNOWN_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".bmp",
]);

const CLIPBOARD_IMAGE_SCRIPT = `
function run(argv) {
  ObjC.import("AppKit");

  const directory = argv[0];
  const pasteboard = $.NSPasteboard.generalPasteboard;
  const candidates = [
    { type: "public.png", file: "clipboard.png", mimeType: "image/png" },
    { type: "public.jpeg", file: "clipboard.jpg", mimeType: "image/jpeg" },
    { type: "public.tiff", file: "clipboard.tiff", mimeType: "image/tiff" },
    { type: "com.compuserve.gif", file: "clipboard.gif", mimeType: "image/gif" },
    { type: "org.webmproject.webp", file: "clipboard.webp", mimeType: "image/webp" }
  ];

  for (const candidate of candidates) {
    const data = pasteboard.dataForType($(candidate.type));
    if (!data) {
      continue;
    }

    const path = directory + "/" + candidate.file;
    if (data.writeToFileAtomically($(path), true)) {
      return JSON.stringify({ path: path, mimeType: candidate.mimeType });
    }
  }

  throw new Error("No image data on clipboard");
}
`;

export interface ImageInput {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  sourceLabel: string;
}

interface ClipboardImageResult {
  path: string;
  mimeType: string;
}

export async function getImageInput(
  mode: ImageSourceMode = "capture",
): Promise<ImageInput> {
  const errors: string[] = [];

  if (mode === "capture") {
    return getScreenshotSelectionImageInput();
  }

  if (mode === "auto" || mode === "finder") {
    try {
      return await getFinderImageInput();
    } catch (error) {
      errors.push(`Finder: ${getErrorMessage(error)}`);
      if (mode === "finder") {
        throw error;
      }
    }
  }

  if (mode === "auto" || mode === "clipboard") {
    try {
      return await getClipboardImageInput();
    } catch (error) {
      errors.push(`Clipboard: ${getErrorMessage(error)}`);
      if (mode === "clipboard") {
        throw error;
      }
    }
  }

  throw new Error(`No screenshot image found. ${errors.join(" ")}`);
}

async function getScreenshotSelectionImageInput(): Promise<ImageInput> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "latex-ocr-capture-"),
  );
  const outputPath = join(temporaryDirectory, "selection.png");

  try {
    await execFileAsync(
      "screencapture",
      ["-i", "-x", "-t", "png", outputPath],
      {
        maxBuffer: 1024 * 1024,
      },
    );
    return await readImageFile(outputPath, "Screenshot selection", "image/png");
  } catch (error) {
    throw new Error(
      `Screenshot selection failed or was canceled: ${getErrorMessage(error)}`,
    );
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

async function getFinderImageInput(): Promise<ImageInput> {
  const selectedItems = await getSelectedFinderItems();
  if (selectedItems.length === 0) {
    throw new Error("No Finder item selected.");
  }

  const errors: string[] = [];
  for (const item of selectedItems) {
    try {
      return await readImageFile(item.path, `Finder: ${basename(item.path)}`);
    } catch (error) {
      errors.push(`${basename(item.path)}: ${getErrorMessage(error)}`);
    }
  }

  throw new Error(
    `Selected Finder items do not include a supported image. ${errors.join(" ")}`,
  );
}

async function getClipboardImageInput(): Promise<ImageInput> {
  const clipboard = await Clipboard.read();
  const errors: string[] = [];

  const clipboardFilePath = await resolveExistingFilePath(clipboard.file);
  if (clipboardFilePath) {
    try {
      return await readImageFile(
        clipboardFilePath,
        `Clipboard file: ${basename(clipboardFilePath)}`,
      );
    } catch (error) {
      errors.push(`clipboard file: ${getErrorMessage(error)}`);
    }
  }

  const pathFromText = await resolveClipboardTextPath(clipboard.text);
  if (pathFromText) {
    try {
      return await readImageFile(
        pathFromText,
        `Clipboard path: ${basename(pathFromText)}`,
      );
    } catch (error) {
      errors.push(`clipboard path: ${getErrorMessage(error)}`);
    }
  }

  try {
    return await readRawClipboardImage();
  } catch (error) {
    errors.push(`raw clipboard image: ${getErrorMessage(error)}`);
  }

  throw new Error(
    `Clipboard does not contain a readable image. ${errors.join(" ")}`,
  );
}

async function resolveClipboardTextPath(
  text: string | undefined,
): Promise<string | undefined> {
  const value = text?.trim();
  if (!value) {
    return undefined;
  }

  const firstLine = stripWrappingQuotes(
    value.split(/\r?\n/, 1)[0]?.trim() ?? "",
  );
  return resolveExistingFilePath(firstLine);
}

async function resolveExistingFilePath(
  value: string | undefined,
): Promise<string | undefined> {
  const normalized = value ? stripWrappingQuotes(value.trim()) : "";
  if (!normalized) {
    return undefined;
  }

  const candidate = normalized.startsWith("file://")
    ? fileURLToPath(normalized)
    : normalized;
  if (!isAbsolute(candidate)) {
    return undefined;
  }

  try {
    const stats = await stat(candidate);
    return stats.isFile() ? candidate : undefined;
  } catch {
    return undefined;
  }
}

async function readRawClipboardImage(): Promise<ImageInput> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "latex-ocr-clipboard-"),
  );

  try {
    const { stdout } = await execFileAsync(
      "osascript",
      ["-l", "JavaScript", "-e", CLIPBOARD_IMAGE_SCRIPT, temporaryDirectory],
      {
        maxBuffer: 1024 * 1024,
      },
    );
    const result = parseClipboardImageResult(stdout);
    return await readImageFile(result.path, "Clipboard image", result.mimeType);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

async function readImageFile(
  filePath: string,
  sourceLabel: string,
  explicitMimeType?: string,
): Promise<ImageInput> {
  const stats = await stat(filePath);
  if (!stats.isFile()) {
    throw new Error("Path is not a file.");
  }

  if (!looksLikeImagePath(filePath) && !explicitMimeType) {
    throw new Error("File extension is not a known image type.");
  }

  const buffer = await readFile(filePath);
  const mimeType = explicitMimeType ?? inferMimeType(filePath, buffer);

  if (API_SUPPORTED_MIME_TYPES.has(mimeType)) {
    return makeImageInput(buffer, mimeType, sourceLabel);
  }

  if (CONVERTIBLE_MIME_TYPES.has(mimeType)) {
    return convertImageWithSips(filePath, sourceLabel);
  }

  throw new Error(`Unsupported image type: ${mimeType || "unknown"}.`);
}

async function convertImageWithSips(
  filePath: string,
  sourceLabel: string,
): Promise<ImageInput> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "latex-ocr-convert-"),
  );
  const outputPath = join(temporaryDirectory, "converted.png");

  try {
    await execFileAsync(
      "sips",
      ["-s", "format", "png", filePath, "--out", outputPath],
      {
        maxBuffer: 1024 * 1024,
      },
    );
    const buffer = await readFile(outputPath);
    return makeImageInput(buffer, "image/png", `${sourceLabel} (converted)`);
  } catch (error) {
    throw new Error(
      `Could not convert image to PNG with sips: ${getErrorMessage(error)}`,
    );
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function makeImageInput(
  buffer: Buffer,
  mimeType: string,
  sourceLabel: string,
): ImageInput {
  const base64 = buffer.toString("base64");
  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    mimeType,
    sizeBytes: buffer.byteLength,
    sourceLabel,
  };
}

function parseClipboardImageResult(stdout: string): ClipboardImageResult {
  const payload = stdout.trim().split(/\r?\n/).at(-1);
  if (!payload) {
    throw new Error("Clipboard image extraction returned no data.");
  }

  const parsed = JSON.parse(payload) as Partial<ClipboardImageResult>;
  if (typeof parsed.path !== "string" || typeof parsed.mimeType !== "string") {
    throw new Error("Clipboard image extraction returned an invalid payload.");
  }

  return {
    path: parsed.path,
    mimeType: parsed.mimeType,
  };
}

function looksLikeImagePath(filePath: string): boolean {
  return KNOWN_IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function inferMimeType(filePath: string, buffer: Buffer): string {
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a"
  ) {
    return "image/gif";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) ||
    buffer.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))
  ) {
    return "image/tiff";
  }

  return mimeTypeFromExtension(filePath);
}

function mimeTypeFromExtension(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
