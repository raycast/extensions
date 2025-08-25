import path from "path";
import fs from "fs";
import { findFFMpegCLIPath as findFFMpegPath, findGifSkiPath } from "./gifski";
import { execPromise } from "../util/exec";

/**
 * Setting a small list of the https://handbrake.fr/docs/en/latest/technical/source-formats.html
 * New settings are welcome as long as they're tested
 */
export const INPUT_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"] as const;

export function getUniqueOutputPath(filePath: string, extension: string): string {
  const outputFilePath = filePath.replace(path.extname(filePath), extension);
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    const fileName = path.basename(outputFilePath, extension);
    const dirName = path.dirname(outputFilePath);
    finalOutputPath = path.join(dirName, `${fileName}_${counter}${extension}`);
    counter++;
  }

  return finalOutputPath;
}

export function checkExtensionType(file: string, allowedExtensions: ReadonlyArray<string>): boolean {
  const extension = path.extname(file).toLowerCase();
  return allowedExtensions.includes(extension as (typeof allowedExtensions)[number]) ? true : false;
}

export async function convertMedia(
  filePath: string,
  outputFormat: string,
  fps: string,
  scaleW: string,
  scaleH: string,
): Promise<string> {
  const ffmpeg = await findFFMpegPath();
  const gifski = await findGifSkiPath();

  if (!ffmpeg || !gifski) {
    throw new Error("FFMpeg or GifSki are not installed");
  }

  let command = ffmpeg;

  command += ` -i ${filePath}`;
  command += ` -vf "fps=${fps},scale=${scaleW}:${scaleH}" -f yuv4mpegpipe -`;
  command += ` | ${gifski}`;

  const finalOutputPath = getUniqueOutputPath(filePath, outputFormat);
  command += ` -o ${finalOutputPath} -`;

  console.log(`Executing command: ${command}`);
  await execPromise(command);
  return finalOutputPath;
}
