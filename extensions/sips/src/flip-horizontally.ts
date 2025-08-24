/**
 * @file flip-horizontally.ts
 *
 * @summary Raycast command to flip selected images horizontally.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:54:33
 * Last modified  : 2023-07-18 18:48:24
 */

import flip from "./operations/flipOperation";
import runOperation from "./operations/runOperation";
import { Direction } from "./utilities/enums";
import { getSelectedImages } from "./utilities/utils";

export default async function Command() {
  const selectedImages = await getSelectedImages();
  await runOperation({
    operation: () => flip(selectedImages, Direction.HORIZONTAL),
    selectedImages,
    inProgressMessage: "Flipping in progress...",
    successMessage: "Flipped",
    failureMessage: "Failed to flip",
  });
}
