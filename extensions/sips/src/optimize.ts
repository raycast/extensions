/**
 * @file optimize.ts
 *
 * @summary Raycast command to optimize selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:16
 * Last modified  : 2023-07-18 18:48:32
 */

import { showToast, Toast } from "@raycast/api";

import optimize from "./operations/optimizeOperation";
import runOperation from "./operations/runOperation";
import { getSelectedImages } from "./utilities/utils";

export default async function Command(props: { arguments: { optimizationFactor: string } }) {
  const { optimizationFactor } = props.arguments;

  let optimizationValue = 50;
  if (optimizationFactor != "") {
    optimizationValue = parseFloat(optimizationFactor);
    if (!optimizationValue) {
      await showToast({
        title: "Invalid optimization factor",
        style: Toast.Style.Failure,
      });
      return;
    }
  }

  const selectedImages = await getSelectedImages();
  await runOperation({
    operation: () => optimize(selectedImages, optimizationValue),
    selectedImages,
    inProgressMessage: "Optimization in progress...",
    successMessage: "Optimized",
    failureMessage: "Failed to optimize",
  });
}
