/**
 * @file flip-horizontally.ts
 *
 * @summary Raycast command to flip selected images horizontally.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:54:33
 * Last modified  : 2023-07-06 15:47:56
 */

import { showToast, Toast } from "@raycast/api";

import flip from "./operations/flipOperation";
import { Direction } from "./utilities/enums";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";

export default async function Command() {
  const selectedImages = await getSelectedImages();

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Flipping in progress...", style: Toast.Style.Animated });

  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    await flip(selectedImages, Direction.HORIZONTAL);
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showErrorToast(`Failed to flip ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
  } finally {
    await cleanup();
  }
}
