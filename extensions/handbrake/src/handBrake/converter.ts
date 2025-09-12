import path from "path";
import fs from "fs";
import { findHandBrakeCLIPath } from "./handBrakeCLI";
import { execPromise } from "../util/exec";

/**
 * Setting a small list of the https://handbrake.fr/docs/en/latest/technical/source-formats.html
 * New settings are welcome as long as they're tested
 */
export const INPUT_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"] as const;
export const OUTPUT_VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm"] as const;

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
  return allowedExtensions.includes(extension as (typeof allowedExtensions)[number]);
}

export async function convertMedia(
  filePath: string,
  outputFormat: (typeof OUTPUT_VIDEO_EXTENSIONS)[number],
  preset: string,
): Promise<string> {
  let cli = await findHandBrakeCLIPath();
  if (!cli) {
    throw new Error("HandbrakeCLI is not installed or configured");
  }

  if (checkExtensionType(filePath, INPUT_VIDEO_EXTENSIONS)) {
    const currentOutputFormat = outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number];

    cli += ` --preset "${preset}"`;
    cli += ` --input "${filePath}"`;

    switch (currentOutputFormat) {
      case ".mp4":
        cli += ` --format av_mp4`;
        break;
      case ".mkv":
        cli += ` --format av_mkv`;
        break;
      case ".webm":
        cli += ` --format av_webm`;
        break;
      default:
        throw new Error(`Unknown video output format: ${currentOutputFormat}`);
    }

    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
    cli += ` --output "${finalOutputPath}"`;

    console.log(`Executing command: ${cli}`);
    await execPromise(cli);
    return finalOutputPath;
  }
  // Theoretically, this should never happen
  throw new Error(`Unsupported output format: ${outputFormat}`);
}
