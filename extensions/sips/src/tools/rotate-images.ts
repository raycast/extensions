import rotate from "../operations/rotateOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The angle to rotate the image, assumed to be in degrees by default.
   */
  angle: number;

  /**
   * Indication that the angle is specified in radians.
   */
  isRadians?: boolean;

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ angle, isRadians, imagePaths }: Input) {
  let validatedAngle = parseFloat(angle.toString());
  if (isNaN(validatedAngle)) {
    throw new Error("Invalid angle: must be a number");
  }

  if (isRadians === true) {
    validatedAngle = validatedAngle * (180 / Math.PI);
  }

  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();
  const rotatedImages = await rotate(selectedImages, validatedAngle);

  await cleanup();

  return rotatedImages;
}
