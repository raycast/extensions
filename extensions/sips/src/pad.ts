/**
 * @file pad.ts
 *
 * @summary Raycast command to add padding to selected images.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:55:36
 * Last modified  : 2023-07-18 18:48:38
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";

import pad from "./operations/padOperation";
import runOperation from "./operations/runOperation";
import { getSelectedImages } from "./utilities/utils";

export default async function Command(props: { arguments: { amount: string; hexcolor: string } }) {
  const { amount, hexcolor } = props.arguments;
  const selectedImages = await getSelectedImages();
  const preferences = getPreferenceValues<Preferences.Pad>();

  const padAmount = parseInt(amount);
  if (isNaN(padAmount) || padAmount < 0) {
    await showToast({
      title: "Padding amount must be a positive integer",
      style: Toast.Style.Failure,
    });
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

  await runOperation({
    operation: () => pad(selectedImages, padAmount, hexString),
    selectedImages,
    inProgressMessage: "Padding in progress...",
    successMessage: "Padded",
    failureMessage: "Failed to pad",
  });
}
