/**
 * @file optimize.ts
 *
 * @summary Raycast command to optimize selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:16
 * Last modified  : 2023-07-06 15:48:02
 */

import { showToast, Toast } from "@raycast/api";

import optimize from "./operations/optimizeOperation";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";

export default async function Command(props: { arguments: { optimizationFactor: string } }) {
  const { optimizationFactor } = props.arguments;

  let optimizationValue = 100;
  if (optimizationFactor != "") {
    optimizationValue = parseFloat(optimizationFactor);
    if (!optimizationValue) {
      await showToast({ title: "Invalid optimization factor", style: Toast.Style.Failure });
      return;
    }
  }

  const selectedImages = await getSelectedImages();
  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Optimization in progress...", style: Toast.Style.Animated });

  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    await optimize(selectedImages, optimizationValue);
    toast.title = `Optimized ${selectedImages.length.toString()} ${pluralized}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showErrorToast(`Failed to optimize ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
  } finally {
    await cleanup();
  }
}
