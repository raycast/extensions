/**
 * @file scale.ts
 *
 * @summary Raycast command to scale selected images by a given factor.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:56:29
 * Last modified  : 2023-07-18 18:48:52
 */

import { showToast, Toast } from "@raycast/api";

import runOperation from "./operations/runOperation";
import scale from "./operations/scaleOperation";
import { getSelectedImages } from "./utilities/utils";

export default async function Command(props: { arguments: { scaleFactor: string } }) {
  const { scaleFactor } = props.arguments;

  const scaleNumber = parseFloat(scaleFactor);
  if (isNaN(scaleNumber)) {
    await showToast({
      title: "Scale factor must be a number",
      style: Toast.Style.Failure,
    });
    return;
  }

  const selectedImages = await getSelectedImages();
  await runOperation({
    operation: () => scale(selectedImages, scaleNumber),
    selectedImages,
    inProgressMessage: "Scaling in progress...",
    successMessage: "Scaled",
    failureMessage: "Failed to scale",
  });
}
