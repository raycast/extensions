import { Config, Image, Imager, Input, Output } from "../types";
import tinypng from "../services/tinypng";
import { saveStreamToTmpFile } from "../supports/file";
import { buildNewImageName, imageExtensionToMimeType } from "../supports/image";

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
  const key = services?.["tinypng"]?.["apiKey"] as string;
  const format = config?.["format"] as string;
  const mimetype = imageExtensionToMimeType(format);

  const privateUrl = await tinypng.upload(i as Image, key);
  const stream = (await tinypng.convert(privateUrl, key, { type: mimetype })) as NodeJS.ReadableStream;
  const newfile = await saveStreamToTmpFile(stream, buildNewImageName(originImage.get(), format));

  console.log(`converted image path: ${newfile}`);

  return { type: "filepath", value: newfile } as Output;
}
