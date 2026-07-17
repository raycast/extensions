import stripEXIF from "../operations/stripEXIFOperation";
import { getExifToolLocation } from "../strip-exif";
import { ExifToolLocation } from "../utilities/enums";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ imagePaths }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();

  const exifToolLocation = await getExifToolLocation();
  if (!exifToolLocation) {
    throw Error("Failed to find ExifTool");
  }

  const strippedImages = await stripEXIF(selectedImages, exifToolLocation as ExifToolLocation);

  await cleanup();

  return strippedImages;
}
