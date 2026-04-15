import { closeMainWindow, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";

import { copyToClipboard } from "./lib/clipboard";
import { captureRegionToFile, CaptureCancelledError } from "./lib/capture";
import { ConfigValidationError, formatPreferenceFieldList, loadConfig } from "./lib/config";
import { attemptLabel, formatBytes, toErrorMessage } from "./lib/format";
import { ImageUploadFailedError, saveFailedUpload, uploadImageFile } from "./lib/image-upload";
import { cleanupFile, createTempFilePath } from "./lib/paths";

export default async function command(): Promise<void> {
  const progressToast = await showToast({
    style: Toast.Style.Animated,
    title: "Validating Shots settings",
  });

  let rawPath: string | undefined;

  try {
    const config = loadConfig();

    progressToast.title = "Select screenshot region";
    await closeMainWindow();
    await delay(120);
    await showHUD("Shots: Select a region");

    rawPath = await createTempFilePath("png");
    await captureRegionToFile(rawPath);

    progressToast.title = "Compressing screenshot";
    const uploadResult = await uploadImageFile(config, rawPath, {
      onUploading: () => {
        progressToast.title = "Uploading screenshot";
      },
    });

    try {
      await copyToClipboard(uploadResult.publicUrl);
      progressToast.style = Toast.Style.Success;
      progressToast.title = "Screenshot uploaded";
      progressToast.message = `${uploadResult.format.toUpperCase()} uploaded (${formatBytes(uploadResult.bytes)}, ${attemptLabel(uploadResult.attempts)})`;
      await showToast({
        style: Toast.Style.Success,
        title: "URL copied to clipboard",
        message: `${uploadResult.format.toUpperCase()} link ready`,
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

    if (error instanceof CaptureCancelledError) {
      progressToast.style = Toast.Style.Failure;
      progressToast.title = "Screenshot cancelled";
      progressToast.message = "No screenshot was captured.";
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
    progressToast.title = "Screenshot failed";
    progressToast.message = toErrorMessage(error);
  } finally {
    await cleanupFile(rawPath);
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
