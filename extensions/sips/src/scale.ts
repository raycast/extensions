/**
 * @file scale.ts
 *
 * @summary Raycast command to scale selected images by a given factor.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:56:29
 * Last modified  : 2023-07-06 15:48:08
 */

import { showToast, Toast } from "@raycast/api";

import scale from "./operations/scaleOperation";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";

export default async function Command(props: { arguments: { scaleFactor: string } }) {
  const { scaleFactor } = props.arguments;

  const scaleNumber = parseFloat(scaleFactor);
  if (isNaN(scaleNumber)) {
    await showToast({ title: "Scale factor must be a number", style: Toast.Style.Failure });
    return;
  }

  const selectedImages = await getSelectedImages();
  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Scaling in progress...", style: Toast.Style.Animated });

  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    await scale(selectedImages, scaleNumber);
    toast.title = `Scaled ${selectedImages.length.toString()} ${pluralized}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showErrorToast(`Failed to scale ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
  } finally {
    await cleanup();
  }
}
