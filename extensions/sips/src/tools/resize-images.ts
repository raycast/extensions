import resize from "../operations/resizeOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The width to resize the images to. Set to -1 to maintain aspect ratio.
   */
  width: number;

  /**
   * The height to resize the images to. Set to -1 to maintain aspect ratio.
   */
  height: number;

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ width, height, imagePaths }: Input) {
  const validatedWidth = parseInt(width.toString());
  const validatedHeight = parseInt(height.toString());
  if (isNaN(validatedWidth) || (validatedHeight !== -1 && validatedWidth < 1)) {
    throw new Error("Invalid width: must be a positive integer");
  }
  if (isNaN(validatedHeight) || (validatedHeight !== -1 && validatedHeight < 1)) {
    throw new Error("Invalid height: must be a positive integer");
  }

  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();
  const resizedImages = await resize(selectedImages, validatedWidth, validatedHeight);

  await cleanup();

  return resizedImages;
}
