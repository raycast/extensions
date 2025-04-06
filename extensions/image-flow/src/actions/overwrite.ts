import { Config, Imager, Input, Output } from "../types";
import fs from "fs";
import { saveStreamToFile } from "../supports/file";
import { buildNewImageName } from "../supports/image";
import path from "path";

/**
 * Overwrite the origin image with the processed image.
 *
 * @param i input must be an image path
 * @param _config
 * @param _services
 * @param originImage the origin image will be renamed to the processed image path
 *
 * @return overwritten image path
 */
export default async function (
  i: Input,
  _config: Config,
  _services: Record<string, Config>,
  originImage: Imager,
): Promise<Output> {
  const inputPath = i.value;
  const originPath = originImage.get().value;

  if (inputPath === originPath) {
    return i as Output;
  }

  const filename = buildNewImageName(originImage.get(), path.extname(inputPath));
  const newFile = originPath.replace(path.basename(originPath), filename);

  await saveStreamToFile(fs.createReadStream(inputPath), newFile);
  if (fs.existsSync(originPath)) {
    fs.unlinkSync(originPath);
  }

  originImage.set({ type: "filepath", value: newFile });

  return { type: "filepath", value: newFile } as Output;
}
