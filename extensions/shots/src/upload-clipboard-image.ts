import { Clipboard, closeMainWindow, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import {
  getReadableClipboardImageFile,
  writeClipboardImageToTempFile,
  ClipboardImageNotFoundError,
} from "./lib/clipboard-image";
import { copyToClipboard } from "./lib/clipboard";
import { ConfigValidationError, formatPreferenceFieldList, loadConfig } from "./lib/config";
import { attemptLabel, formatBytes, toErrorMessage } from "./lib/format";
import { ImageUploadFailedError, saveFailedUpload, uploadImageFile } from "./lib/image-upload";
import { cleanupFile } from "./lib/paths";

export default async function command(): Promise<void> {
  await closeMainWindow();
  await delay(120);

  const progressToast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading clipboard",
  });
  let temporaryClipboardPath: string | undefined;

  try {
    const config = loadConfig();
    const imagePath = await getClipboardImagePath();

    progressToast.title = "Compressing clipboard image";
    const uploadResult = await uploadImageFile(config, imagePath, {
      onUploading: () => {
        progressToast.title = "Uploading clipboard image";
      },
    });

    try {
      await copyToClipboard(uploadResult.publicUrl);
      progressToast.style = Toast.Style.Success;
      progressToast.title = "Clipboard image uploaded";
      progressToast.message = `${uploadResult.format.toUpperCase()} uploaded (${formatBytes(uploadResult.bytes)}, ${attemptLabel(uploadResult.attempts)})`;
      await showToast({
        style: Toast.Style.Success,
        title: "URL copied to clipboard",
        message: "Clipboard image link ready",
      });
    } catch (clipboardError: unknown) {
      progressToast.style = Toast.Style.Success;
      progressToast.title = "Uploaded, but clipboard copy failed";
      progressToast.message = `${uploadResult.publicUrl} (${toErrorMessage(clipboardError)})`;
    }
  } catch (error: unknown) {
    if (error instanceof ConfigValidationError) {
      progressToast.style = Toast.Style.Failure;
      progressToast.title = "Finish setup in preferences";
      progressToast.message = `Add or fix: ${formatPreferenceFieldList(error.fields)}`;
      await openExtensionPreferences();
      return;
    }

    if (error instanceof ClipboardImageNotFoundError) {
      progressToast.style = Toast.Style.Failure;
      progressToast.title = "No clipboard image found";
      progressToast.message = "Copy an image file or local image path first.";
      return;
    }

    if (error instanceof ImageUploadFailedError) {
      try {
        const fallbackPath = await saveFailedUpload(error);
        progressToast.style = Toast.Style.Failure;
        progressToast.title = "Upload failed; local file saved";

        try {
          await copyToClipboard(fallbackPath);
          progressToast.message = fallbackPath;
        } catch (clipboardError: unknown) {
          progressToast.message = `${fallbackPath} (${toErrorMessage(clipboardError)})`;
        }
      } catch (fallbackError: unknown) {
        progressToast.style = Toast.Style.Failure;
        progressToast.title = "Upload failed";
        progressToast.message = toErrorMessage(fallbackError);
      }
      return;
    }

    progressToast.style = Toast.Style.Failure;
    progressToast.title = "Clipboard upload failed";
    progressToast.message = toErrorMessage(error);
  } finally {
    await cleanupFile(temporaryClipboardPath);
  }

  async function getClipboardImagePath(): Promise<string> {
    try {
      return await getReadableClipboardImageFile(await Clipboard.read());
    } catch (error: unknown) {
      if (!(error instanceof ClipboardImageNotFoundError)) {
        throw error;
      }
    }

    temporaryClipboardPath = await writeClipboardImageToTempFile();
    return temporaryClipboardPath;
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
