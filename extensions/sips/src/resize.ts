/**
 * @file resize.ts
 *
 * @summary Raycast command to resize selected images to a specified width and/or height.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:58
 * Last modified  : 2023-07-18 18:48:42
 */

import { showToast, Toast } from "@raycast/api";

import resize from "./operations/resizeOperation";
import runOperation from "./operations/runOperation";
import { getSelectedImages } from "./utilities/utils";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const { width, height } = props.arguments;

  if (width == "" && height == "") {
    await showToast({
      title: "Must specify either width or height",
      style: Toast.Style.Failure,
    });
    return;
  }

  const widthInt = width == "" ? -1 : parseInt(width);
  const heightInt = height == "" ? -1 : parseInt(height);

  if (isNaN(widthInt)) {
    await showToast({
      title: "Width must be an integer",
      style: Toast.Style.Failure,
    });
    return;
  } else if (isNaN(heightInt)) {
    await showToast({
      title: "Height must be an integer",
      style: Toast.Style.Failure,
    });
    return;
  }

  const selectedImages = await getSelectedImages();
  await runOperation({
    operation: () => resize(selectedImages, widthInt, heightInt),
    selectedImages,
    inProgressMessage: "Resizing in progress...",
    successMessage: "Resized",
    failureMessage: "Failed to resize",
  });
}
