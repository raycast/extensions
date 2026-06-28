import pad from "../operations/padOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The size of the border/padded area to add to the image. Examples: 10 for 10px, 25 for "size 25", 200 for "00 units"
   */
  borderSize: number;

  /**
   * The HEX color of the border to add to the image. This must be in the format "RRGGBB", e.g. "FF0000" for red.
   */
  color: string;

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ borderSize, color, imagePaths }: Input) {
  const validatedSize = parseInt(borderSize.toString());
  if (isNaN(validatedSize) || validatedSize < 0) {
    throw new Error("Invalid border size: must be a positive integer");
  }

  if (!color.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
    throw new Error("Invalid color: must be a HEX color in the format RRGGBB");
  }

  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();

  const paddedImages = await pad(selectedImages, validatedSize, color);

  await cleanup();

  return paddedImages;
}
