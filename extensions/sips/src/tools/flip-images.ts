import flip from "../operations/flipOperation";
import { Direction } from "../utilities/enums";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The direction to flip the images.
   *
   * @remarks
   * If no direction is specified, assume that the images should be flipped horizontally.
   */
  direction: "vertical" | "horizontal";

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ direction, imagePaths }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();

  const flippedImages = await flip(selectedImages, direction == "vertical" ? Direction.VERTICAL : Direction.HORIZONTAL);

  await cleanup();

  return flippedImages;
}
