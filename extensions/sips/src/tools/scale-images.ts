import scale from "../operations/scaleOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The multiplication factor to scale the images by. Ex: 2 will double the width and height, 0.5 will halve them.
   */
  factor: number;

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ factor, imagePaths }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();
  const scaledImages = await scale(selectedImages, factor);

  await cleanup();

  return scaledImages;
}
