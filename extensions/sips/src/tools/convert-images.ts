import convert from "../operations/convertOperation";
import { cleanup, getSelectedImages } from "../utilities/utils";

type Input = {
  /**
   * The format to convert the images to.
   */
  format:
    | "ASTC"
    | "AVIF"
    | "BMP"
    | "DDS"
    | "EXR"
    | "GIF"
    | "HEIC"
    | "HEICS"
    | "ICNS"
    | "ICO"
    | "JPEG"
    | "JP2"
    | "KTX"
    | "PBM"
    | "PDF"
    | "PNG"
    | "PSD"
    | "PVR"
    | "TGA"
    | "TIFF"
    | "WEBP"
    | "SVG";

  /**
   * Optional array of image paths to process. If not provided, will attempt to get selected images from Finder.
   */
  imagePaths?: string[];
};

export default async function ({ format, imagePaths }: Input) {
  const selectedImages = imagePaths?.length ? imagePaths : await getSelectedImages();
  const convertedImages = await convert(selectedImages, format);

  await cleanup();

  return convertedImages;
}
