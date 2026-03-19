import { closeMainWindow, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { writeFile } from "node:fs/promises";

import { copyToClipboard } from "./lib/clipboard";
import { captureRegionToFile, CaptureCancelledError } from "./lib/capture";
import { ConfigValidationError, loadConfig } from "./lib/config";
import { compressToTarget } from "./lib/compress";
import { buildObjectKey, cleanupFile, createTempFilePath, moveToFailureDirectory } from "./lib/paths";
import { uploadWithRetry } from "./lib/storage";
import { buildPublicUrl } from "./lib/url";

export default async function command(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Validating Maklik settings",
  });

  let rawPath: string | undefined;
  let compressedPath: string | undefined;
  let objectKey: string | undefined;
  let compressedExtension: "webp" | "jpg" = "webp";

  try {
    const config = loadConfig();

    toast.title = "Select screenshot region";
    await closeMainWindow();
    await delay(120);
    await showHUD("Maklik: Select a region");

    rawPath = await createTempFilePath("png");
    await captureRegionToFile(rawPath);

    toast.title = "Compressing screenshot";
    const compressedImage = await compressToTarget(rawPath, config.maxUploadBytes);
    compressedExtension = compressedImage.extension;
    compressedPath = await createTempFilePath(compressedImage.extension);
    await writeFile(compressedPath, compressedImage.buffer);

    objectKey = buildObjectKey(config.keyPrefix, new Date(), compressedImage.extension);

    toast.title = "Uploading screenshot";
    const uploadResult = await uploadWithRetry(config, {
      objectKey,
      body: compressedImage.buffer,
      contentType: compressedImage.contentType,
    });

    const publicUrl = buildPublicUrl(config.publicBaseUrl, objectKey);

    try {
      await copyToClipboard(publicUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Screenshot uploaded";
      toast.message = `${compressedImage.format.toUpperCase()} URL copied (${formatBytes(compressedImage.bytes)}, ${attemptLabel(uploadResult.attempts)})`;
    } catch (clipboardError: unknown) {
      toast.style = Toast.Style.Success;
      toast.title = "Uploaded, but clipboard copy failed";
      toast.message = `${publicUrl} (${toErrorMessage(clipboardError)})`;
    }
  } catch (error: unknown) {
    if (error instanceof ConfigValidationError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid extension preferences";
      toast.message = `Fix: ${error.fields.join(", ")}`;
      await openExtensionPreferences();
      return;
    }

    if (error instanceof CaptureCancelledError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Screenshot cancelled";
      toast.message = "No screenshot was captured.";
      return;
    }

    if (compressedPath) {
      const fallbackKey = objectKey ?? buildObjectKey(undefined, new Date(), compressedExtension);
      try {
        const fallbackPath = await moveToFailureDirectory(compressedPath, fallbackKey);
        compressedPath = undefined;
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed; local file saved";

        try {
          await copyToClipboard(fallbackPath);
          toast.message = fallbackPath;
        } catch (clipboardError: unknown) {
          toast.message = `${fallbackPath} (${toErrorMessage(clipboardError)})`;
        }
      } catch (fallbackError: unknown) {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = toErrorMessage(fallbackError);
      }
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "Screenshot failed";
    toast.message = toErrorMessage(error);
  } finally {
    await cleanupFile(rawPath);
    await cleanupFile(compressedPath);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function attemptLabel(attempts: number): string {
  return `${attempts} attempt${attempts === 1 ? "" : "s"}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
