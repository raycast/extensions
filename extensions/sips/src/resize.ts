/**
 * @file resize.ts
 *
 * @summary Raycast command to resize selected images to a specified width and/or height.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:58
 * Last modified  : 2023-07-06 15:48:06
 */

import { showToast, Toast } from "@raycast/api";

import resize from "./operations/resizeOperation";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";

export default async function Command(props: { arguments: { width: string; height: string } }) {
  const { width, height } = props.arguments;

  if (width == "" && height == "") {
    await showToast({ title: "Must specify either width or height", style: Toast.Style.Failure });
    return;
  }

  const widthInt = width == "" ? -1 : parseInt(width);
  const heightInt = height == "" ? -1 : parseInt(height);

  if (isNaN(widthInt)) {
    await showToast({ title: "Width must be an integer", style: Toast.Style.Failure });
    return;
  } else if (isNaN(heightInt)) {
    await showToast({ title: "Height must be an integer", style: Toast.Style.Failure });
    return;
  }

  const selectedImages = await getSelectedImages();
  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Resizing in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      await resize(selectedImages, widthInt, heightInt);
      toast.title = `Resized ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      await showErrorToast(`Failed to resize ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
    } finally {
      await cleanup();
    }
  }
}
