import optimize from "../operations/optimizeOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * A 0-100 value indicating, roughly, the strength of the optimization.
   */
  power: number;

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ power, imagePaths }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();

  const optimizedImages = await optimize(selectedImages, power);

  await cleanup();

  return optimizedImages;
}
