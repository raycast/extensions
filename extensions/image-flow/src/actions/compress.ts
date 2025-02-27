import { Config, Image, Input, Output } from "../types";
import tinypng from "../services/tinypng";
import { saveStreamToTmpFile } from "../supports/file";
import path from "path";

/**
 * Compress image with TinyPNG, only compress the image size, not resize.
 *
 * see https://tinypng.com/developers/reference#compressing-images
 *
 * @param i input must be an image path or url
 * @param config
 * @param services
 *
 * @return compressed image path or private url of tinypng
 */
export default async function (i: Input, config: Config, services: Record<string, Config>): Promise<Output> {
  const key = services?.["tinypng"]?.["apiKey"] as string;
  const outputType = config?.["output_type"] ?? "filepath";

  const privateUrl = await tinypng.upload(i as Image, key);

  if (outputType && outputType === "url") {
    return { type: "url", value: privateUrl } as Output;
  }

  const stream = (await tinypng.compress(privateUrl)) as NodeJS.ReadableStream;
  const newfile = await saveStreamToTmpFile(stream, path.basename(i.value));

  return { type: "filepath", value: newfile } as Output;
}
