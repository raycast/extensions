/**
 * @file operations/runOperation.ts
 *
 * @summary Runs an operation on the selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-18 18:45:28
 * Last modified  : 2023-07-18 18:46:08
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
  operation: () => Promise<void>;
  selectedImages: string[];
  inProgressMessage: string;
  successMessage: string;
  failureMessage: string;
}) {
  if (params.selectedImages.length === 0 || (params.selectedImages.length === 1 && params.selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: params.inProgressMessage, style: Toast.Style.Animated });
  const pluralized = `image${params.selectedImages.length === 1 ? "" : "s"}`;
  try {
    await params.operation();
    toast.title = `${params.successMessage} ${params.selectedImages.length.toString()} ${pluralized}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showErrorToast(
      `${params.failureMessage} ${params.selectedImages.length.toString()} ${pluralized}`,
      error as Error,
      toast
    );
  } finally {
    await cleanup();
  }
}
