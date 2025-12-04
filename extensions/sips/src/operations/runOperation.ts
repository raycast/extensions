/**
 * @file operations/runOperation.ts
 *
 * @summary Runs an operation on the selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-18 18:45:28
 */

import { showToast, Toast } from "@raycast/api";

import { cleanup, showErrorToast } from "../utilities/utils";

/**
 * Runs an operation on the selected images, displaying a toast while the operation is in progress.
 *
 * @param params.operation The operation to run.
 * @param params.selectedImages The paths of the selected images.
 * @param params.inProgressMessage The message to display while the operation is in progress.
 * @param params.successMessage The message to display if the operation succeeds.
 * @param params.failureMessage The message to display if the operation fails.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function runOperation(params: {
  operation: () => Promise<string[]>;
  selectedImages: string[];
  inProgressMessage: string;
  successMessage: string;
  failureMessage: string;
}) {
  if (params.selectedImages.length === 0 || (params.selectedImages.length === 1 && params.selectedImages[0] === "")) {
    await showToast({
      title: "No images selected",
      message:
        "No images found in your selection. Make sure the image(s) still exist on the disk. If using a third-party file manager, make sure the app's index is up to date.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const toast = await showToast({
    title: params.inProgressMessage,
    style: Toast.Style.Animated,
  });
  const pluralized = `image${params.selectedImages.length === 1 ? "" : "s"}`;
  try {
    const resultPaths = await params.operation();
    toast.title = `${params.successMessage} ${params.selectedImages.length.toString()} ${pluralized}`;
    toast.style = Toast.Style.Success;
    return resultPaths;
  } catch (error) {
    await showErrorToast(
      `${params.failureMessage} ${params.selectedImages.length.toString()} ${pluralized}`,
      error as Error,
      toast,
    );
  } finally {
    await cleanup();
  }
}
