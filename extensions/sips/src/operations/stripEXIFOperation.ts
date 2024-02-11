/**
 * @file operations/padOperation.ts
 *
 * @summary Image sanitization operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:35:48
 * Last modified  : 2024-01-28 05:10:25
 */

import { execSync } from "child_process";

import {
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";
import { ExifToolLocation } from "../utilities/enums";
import { environment } from "@raycast/api";

/**
 * Strips EXIF data from the given images.
 *
 * @param sourcePaths The paths of the images to strip EXIF data from.
 * @param exifToolLocation The location of the ExifTool binary.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function stripEXIF(sourcePaths: string[], exifToolLocation: ExifToolLocation) {
  const newPaths = getDestinationPaths(sourcePaths);
  const resultPaths: string[] = [];

  const exifCommand =
    exifToolLocation === ExifToolLocation.ON_PATH
      ? "exiftool"
      : `"${environment.supportPath}/Image-ExifTool-12.74/exiftool"`;

  // Make sure ExifTool is executable
  if (exifToolLocation === ExifToolLocation.SUPPORT_DIR) {
    execSync(`chmod +x "${environment.supportPath}/Image-ExifTool-12.74/exiftool"`);
  }

  for (const imagePath of sourcePaths) {
    if (imagePath.toLowerCase().endsWith(".webp")) {
      // Convert to PNG, remove EXIF, then restore to WebP
      resultPaths.push(await execSIPSCommandOnWebP(`${exifCommand} -all= "${imagePath}"`, imagePath));
    } else if (imagePath.toLowerCase().endsWith(".svg")) {
      // Convert to PNG, remove EXIF, then restore to SVG
      resultPaths.push(await execSIPSCommandOnSVG(`${exifCommand} -all= "${imagePath}"`, imagePath));
    } else {
      // Image is not a special format, so just strip EXIF data
      const newPath = newPaths[sourcePaths.indexOf(imagePath)];
      resultPaths.push(newPath);

      execSync(`${exifCommand} -all= -o "${newPath}" "${imagePath}"`);
    }
  }

  await moveImageResultsToFinalDestination(resultPaths);
}
