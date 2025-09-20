import { Config, Image, Imager, Input, Output } from "../types";
import tinypng from "../services/tinypng";
import { saveStreamToTmpFile } from "../supports/file";
import { buildNewImageName, imageExtensionToMimeType } from "../supports/image";
import {
  validateAndGetConvertFormat,
  validateAndGetTinyPngApiKey,
  validateInputMustBeImage,
} from "../supports/validate";

/**
 * Convert the image to a different format, tinify currently supports converting between
 * AVIF, WebP, JPEG, and PNG formats.
 *
 * see: https://tinypng.com/developers/reference#converting-images
 *
 * @param i input must be an image path or url
 * @param config
 * @param services
 * @param originImage
 *
 * @return converted image path
 */
export default async function (
  i: Input,
  config: Config,
  services: Record<string, Config>,
  originImage: Imager,
): Promise<Output> {
  validateInputMustBeImage(i);

  const key = validateAndGetTinyPngApiKey(services);
  const format = validateAndGetConvertFormat(config);
  const mimetype = imageExtensionToMimeType(format);

  const privateUrl = await tinypng.upload(i as Image, key);
  const stream = (await tinypng.convert(privateUrl, key, { type: mimetype })) as NodeJS.ReadableStream;
  const newFile = await saveStreamToTmpFile(stream, buildNewImageName(originImage.get(), format));

  return { type: "filepath", value: newFile } as Output;
}
