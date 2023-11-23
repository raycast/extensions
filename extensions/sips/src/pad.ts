/**
 * @file pad.ts
 *
 * @summary Raycast command to add padding to selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:36
 * Last modified  : 2023-07-06 15:48:02
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";

import pad from "./operations/padOperation";
import { cleanup, getSelectedImages, showErrorToast } from "./utilities/utils";
import { PadPreferences } from "./utilities/preferences";

export default async function Command(props: { arguments: { amount: string; hexcolor: string } }) {
  const { amount, hexcolor } = props.arguments;
  const selectedImages = await getSelectedImages();
  const preferences = getPreferenceValues<PadPreferences>();

  const padAmount = parseInt(amount);
  if (isNaN(padAmount) || padAmount < 0) {
    await showToast({ title: "Padding amount must be a positive integer", style: Toast.Style.Failure });
    return;
  }

  let hexString = hexcolor || preferences.defaultPadColor;
  if (hexString.startsWith("#")) {
    hexString = hexString.substring(1);
  }
  if (!hexString.match(/[0-9A-Fa-f]{6}/)) {
    await showToast({ title: "Invalid HEX Color", style: Toast.Style.Failure });
    return;
  }

  if (selectedImages.length === 0 || (selectedImages.length === 1 && selectedImages[0] === "")) {
    await showToast({ title: "No images selected", style: Toast.Style.Failure });
    return;
  }

  const toast = await showToast({ title: "Padding in progress...", style: Toast.Style.Animated });

  if (selectedImages) {
    const pluralized = `image${selectedImages.length === 1 ? "" : "s"}`;
    try {
      await pad(selectedImages, padAmount, hexString);
      toast.title = `Added padding to ${selectedImages.length.toString()} ${pluralized}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      await showErrorToast(`Failed to pad ${selectedImages.length.toString()} ${pluralized}`, error as Error, toast);
    } finally {
      await cleanup();
    }
  }
}
