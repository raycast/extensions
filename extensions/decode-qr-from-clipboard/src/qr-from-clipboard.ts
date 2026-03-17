import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import jsQR from "jsqr";
import { PNG } from "pngjs";

const execFileAsync = promisify(execFile);

const swiftClipboardExportScript = String.raw`
import AppKit
import Foundation

let arguments = CommandLine.arguments

guard arguments.count > 1 else {
  fputs("MISSING_OUTPUT_PATH\n", stderr)
  exit(2)
}

let outputPath = arguments[1]
let pasteboard = NSPasteboard.general

guard let image = NSImage(pasteboard: pasteboard) else {
  fputs("NO_IMAGE\n", stderr)
  exit(3)
}

guard let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
  fputs("PNG_EXPORT_FAILED\n", stderr)
  exit(4)
}

do {
  try pngData.write(to: URL(fileURLWithPath: outputPath))
} catch {
  fputs("WRITE_FAILED\n", stderr)
  exit(5)
}
`;

const jxaClipboardExportScript = String.raw`
ObjC.import("AppKit");
ObjC.import("Foundation");

function run(argv) {
  const outputPath = argv[0];

  if (!outputPath) {
    throw new Error("MISSING_OUTPUT_PATH");
  }

  const pasteboard = $.NSPasteboard.generalPasteboard;
  const image = $.NSImage.alloc.initWithPasteboard(pasteboard);
  const tiffData = image.TIFFRepresentation;

  if (!tiffData) {
    throw new Error("NO_IMAGE");
  }

  const bitmap = $.NSBitmapImageRep.imageRepWithData(tiffData);

  if (!bitmap) {
    throw new Error("PNG_EXPORT_FAILED");
  }

  const pngData = bitmap.representationUsingTypeProperties($.NSPNGFileType, null);

  if (!pngData) {
    throw new Error("PNG_EXPORT_FAILED");
  }

  const didWrite = pngData.writeToFileAtomically(outputPath, true);

  if (!didWrite) {
    throw new Error("WRITE_FAILED");
  }

  return "OK";
}
`;

export async function decodeFirstQrCodeFromClipboard(): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error("This command currently supports macOS only.");
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "raycast-qr-"));
  const imagePath = join(temporaryDirectory, "clipboard-image.png");

  try {
    await exportClipboardImageToPng(imagePath);
    return await decodeFirstQrCodeFromPng(imagePath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function exportClipboardImageToPng(outputPath: string): Promise<void> {
  try {
    await execFileAsync("/usr/bin/swift", ["-e", swiftClipboardExportScript, outputPath]);
    return;
  } catch (error) {
    const stderr = getExecErrorOutput(error);

    if (stderr.includes("NO_IMAGE")) {
      throw new Error("No image found in the clipboard.");
    }
  }

  try {
    await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", jxaClipboardExportScript, outputPath]);
  } catch (error) {
    const stderr = getExecErrorOutput(error);

    if (stderr.includes("NO_IMAGE")) {
      throw new Error("No image found in the clipboard.");
    }

    throw new Error("Could not read an image from the clipboard.");
  }
}

async function decodeFirstQrCodeFromPng(imagePath: string): Promise<string> {
  const imageBuffer = await readFile(imagePath);
  const image = PNG.sync.read(imageBuffer);
  const pixelData = new Uint8ClampedArray(image.data);
  const decodedCode = decodeQrWithFallbacks(pixelData, image.width, image.height);

  if (!decodedCode) {
    throw new Error("No QR code found in the clipboard image.");
  }

  if (decodedCode.data.length === 0) {
    throw new Error("Decoded QR code was empty.");
  }

  return normalizeDecodedPayload(decodedCode.data);
}

function decodeQrWithFallbacks(pixelData: Uint8ClampedArray, width: number, height: number) {
  const decodingStrategies = [
    () => jsQR(pixelData, width, height),
    () => jsQR(pixelData, width, height, { inversionAttempts: "attemptBoth" }),
    () => jsQR(applyThreshold(pixelData, 160), width, height, { inversionAttempts: "attemptBoth" }),
    () => jsQR(applyThreshold(pixelData, 192), width, height, { inversionAttempts: "attemptBoth" }),
  ];

  for (const attemptDecode of decodingStrategies) {
    const decodedCode = attemptDecode();

    if (decodedCode) {
      return decodedCode;
    }
  }

  return null;
}

function applyThreshold(pixelData: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const thresholdedData = new Uint8ClampedArray(pixelData);

  for (let index = 0; index < thresholdedData.length; index += 4) {
    const gray =
      thresholdedData[index] * 0.299 + thresholdedData[index + 1] * 0.587 + thresholdedData[index + 2] * 0.114;
    const value = gray >= threshold ? 255 : 0;

    thresholdedData[index] = value;
    thresholdedData[index + 1] = value;
    thresholdedData[index + 2] = value;
    thresholdedData[index + 3] = 255;
  }

  return thresholdedData;
}

function normalizeDecodedPayload(payload: string): string {
  if (!looksLikeJson(payload)) {
    return payload;
  }

  return payload.replace(/[“”]/g, '"');
}

function looksLikeJson(payload: string): boolean {
  const trimmedPayload = payload.trim();

  return (
    (trimmedPayload.startsWith("{") && trimmedPayload.endsWith("}")) ||
    (trimmedPayload.startsWith("[") && trimmedPayload.endsWith("]"))
  );
}

function getExecErrorOutput(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const stderr = "stderr" in error ? String(error.stderr ?? "") : "";
    const stdout = "stdout" in error ? String(error.stdout ?? "") : "";
    const message = "message" in error ? String(error.message ?? "") : "";

    return [stderr, stdout, message].filter(Boolean).join("\n");
  }

  return "";
}
