import removeBg from "../operations/removeBgOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];

  /**
   * The HEX color to replace the background with. This must be in the format "RRGGBB", e.g. "FF0000" for red. This should be `undefined` unless the user specifically requests background replacement.
   */
  bgReplacementColor?: string;

  /**
   * Whether to crop the image to the subject. This should be `true` unless the user specifically requests not to crop the image.
   */
  shouldCrop?: boolean;
};

export default async function ({ imagePaths, bgReplacementColor, shouldCrop }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();
  const imagesWithoutBg = await removeBg(selectedImages, bgReplacementColor, shouldCrop);
  await cleanup();
  return imagesWithoutBg;
}
