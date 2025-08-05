/**
 * @file rotate.ts
 *
 * @summary Raycast command to rotate selected images by a specified number of degrees.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:56:15
 * Last modified  : 2023-07-18 18:48:47
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { parser } from "mathjs";

import rotate from "./operations/rotateOperation";
import runOperation from "./operations/runOperation";
import { getSelectedImages } from "./utilities/utils";

export default async function Command(props: { arguments: { angle: string } }) {
  const { angle } = props.arguments;
  const preferences = getPreferenceValues<Preferences.Rotate>();

  let angleNumber = parseFloat(parser().evaluate(angle).toString());
  if (isNaN(angleNumber)) {
    await showToast({
      title: "Angle must be a number",
      style: Toast.Style.Failure,
    });
    return;
  }

  if (preferences.rotationUnit === "radians") {
    angleNumber = angleNumber * (180 / Math.PI);
  }

  const selectedImages = await getSelectedImages();
  await runOperation({
    operation: () => rotate(selectedImages, angleNumber),
    selectedImages,
    inProgressMessage: "Rotation in progress...",
    successMessage: "Rotated",
    failureMessage: "Failed to rotate",
  });
}
