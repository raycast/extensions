import { openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { ConfigValidationError, formatPreferenceFieldList, loadConfig } from "./lib/config";
import { attemptLabel, toErrorMessage } from "./lib/format";
import { buildTestObjectKey } from "./lib/paths";
import { deleteObject, uploadWithRetry } from "./lib/storage";

export default async function command(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Testing upload settings",
  });

  let objectKey: string | undefined;

  try {
    const config = loadConfig();
    objectKey = buildTestObjectKey(config.keyPrefix);
    const body = Buffer.from(`Shots test upload ${new Date().toISOString()}\n`, "utf8");

    const uploadResult = await uploadWithRetry(config, {
      objectKey,
      body,
      contentType: "text/plain; charset=utf-8",
    });

    toast.title = "Cleaning up test upload";
    try {
      await deleteObject(config, objectKey);
      toast.style = Toast.Style.Success;
      toast.title = "Upload settings work";
      toast.message = `${config.bucket} accepted a test upload (${attemptLabel(uploadResult.attempts)})`;
    } catch (cleanupError: unknown) {
      toast.style = Toast.Style.Success;
      toast.title = "Upload works; cleanup failed";
      toast.message = `Delete ${objectKey} manually (${toErrorMessage(cleanupError)})`;
    }
  } catch (error: unknown) {
    if (error instanceof ConfigValidationError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Finish setup in preferences";
      toast.message = `Add or fix: ${formatPreferenceFieldList(error.fields)}`;
      await openExtensionPreferences();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = objectKey ? "Test upload failed" : "Invalid upload settings";
    toast.message = toErrorMessage(error);
  }
}
