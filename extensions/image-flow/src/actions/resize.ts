import { Config, Image, Input, Output } from "../types";
import tinypng from "../services/tinypng";
import { saveStreamToTmpFile } from "../supports/file";
import path from "path";
import { validateAndGetTinyPngApiKey, validateInputMustBeImage } from "../supports/validate";

/**
 * Resize image with TinyPNG, this will compress and resize the image.
 *
 * see https://tinypng.com/developers/reference#resizing-images
 *
 * @param i the input must be an image path or url
 * @param config
 * @param services
 *
 * @returns resized image path
 */
export default async function (i: Input, config: Config, services: Record<string, Config>): Promise<Output> {
  validateInputMustBeImage(i);
  const key = validateAndGetTinyPngApiKey(services);

  const privateUrl = await tinypng.upload(i as Image, key as string);
  const stream = (await tinypng.compressAndResize(privateUrl, key as string, {
    method: config?.["type"] as string,
    width: config?.["width"] as number,
    height: config?.["height"] as number,
  })) as NodeJS.ReadableStream;

  const newfile = await saveStreamToTmpFile(stream, path.basename(i.value));

  console.log(`resized image path: ${newfile}`);

  return { type: "filepath", value: newfile } as Output;
}
