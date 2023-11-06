/**
 * @file rotate.ts
 *
 * @summary Raycast command to rotate selected images by a specified number of degrees.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:56:15
 * Last modified  : 2023-07-06 15:48:08
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";

import rotate from "./operations/rotateOperation";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";
import { RotatePreferences } from "./utilities/preferences";
import { parser } from "mathjs";

export default async function Command(props: { arguments: { angle: string } }) {
  const { angle } = props.arguments;
  const preferences = getPreferenceValues<RotatePreferences>();

  const selectedImages = await getSelectedImages();
  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  let angleNumber = parseFloat(parser().evaluate(angle).toString());
  if (isNaN(angleNumber)) {
    await showToast({ title: "Angle must be a number", style: Toast.Style.Failure });
    return;
  }

  if (preferences.rotationUnit === "radians") {
    angleNumber = angleNumber * (180 / Math.PI);
  }

  const toast = await showToast({ title: "Rotation in progress...", style: Toast.Style.Animated });
  const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
  try {
    await rotate(selectedImages, angleNumber);
    toast.title = `Rotated ${selectedImages.length.toString()} ${pluralized} by ${angle} ${
      preferences.rotationUnit === "radians" ? "radians" : "degrees"
    }`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showErrorToast(`Failed to rotate ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
  } finally {
    await cleanup();
  }
}
