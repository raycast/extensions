/**
 * @file operations/padOperation.ts
 *
 * @summary Image sanitization operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:35:48
 */

import { execSync } from "child_process";

import { environment, getPreferenceValues } from "@raycast/api";

import { ExifToolLocation, ImageResultHandling } from "../utilities/enums";
import {
  cleanup,
  execSIPSCommandOnAVIF,
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  expandTilde,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";

/**
 * Strips EXIF data from the given images.
 *
 * @param sourcePaths The paths of the images to strip EXIF data from.
 * @param exifToolLocation The location of the ExifTool binary.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function stripEXIF(sourcePaths: string[], exifToolLocation: ExifToolLocation) {
  const preferences = getPreferenceValues<Preferences>();
  const expandedPaths = sourcePaths.map((path) => expandTilde(path));
  const newPaths = await getDestinationPaths(expandedPaths);
  const resultPaths: string[] = [];

  const exifCommand =
    exifToolLocation === ExifToolLocation.ON_PATH ? "exiftool" : `"${environment.supportPath}/exiftool/exiftool"`;

  // Make sure ExifTool is executable
  if (exifToolLocation === ExifToolLocation.SUPPORT_DIR) {
    execSync(`chmod +x "${environment.supportPath}/exiftool/exiftool"`);
  }

  for (const imagePath of expandedPaths) {
    if (imagePath.toLowerCase().endsWith(".webp")) {
      // Convert to PNG, remove EXIF, then restore to WebP
      resultPaths.push(await execSIPSCommandOnWebP(`${exifCommand} -all= "${imagePath}"`, imagePath));
    } else if (imagePath.toLowerCase().endsWith(".svg")) {
      // Convert to PNG, remove EXIF, then restore to SVG
      resultPaths.push(await execSIPSCommandOnSVG(`${exifCommand} -all= "${imagePath}"`, imagePath));
    } else if (imagePath.toLowerCase().endsWith(".avif")) {
      // Convert to PNG, remove EXIF, then restore to AVIF
      resultPaths.push(
        await execSIPSCommandOnAVIF(`${exifCommand} -all= "${imagePath}" -overwrite_original`, imagePath),
      );
    } else {
      // Image is not a special format, so just strip EXIF data
      const newPath = newPaths[expandedPaths.indexOf(imagePath)];
      resultPaths.push(newPath);

      if (preferences.imageResultHandling === ImageResultHandling.ReplaceOriginal) {
        // Replace the original image with the stripped version
        execSync(`${exifCommand} -all= "${imagePath}" -overwrite_original`);
      } else {
        execSync(`${exifCommand} -all= -o "${newPath}" "${imagePath}"`);
      }
    }
  }

  await moveImageResultsToFinalDestination(resultPaths);
  await cleanup();
  return resultPaths;
}
