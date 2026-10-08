/**
 * @file operations/padOperation.ts
 *
 * @summary Image padding operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:35:48
 */

import { execSync } from "child_process";

import {
  execSIPSCommandOnAVIF,
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  expandTilde,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";

/**
 * Adds padding of the specified width and color to images, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to pad.
 * @param padding The width of the padding to add.
 * @param color The color of the padding to add as a hex string with no leading #.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function pad(sourcePaths: string[], padding: number, color: string) {
  const expandedPaths = sourcePaths.map((path) => expandTilde(path));
  const newPaths = await getDestinationPaths(expandedPaths);
  const resultPaths: string[] = [];

  for (const imagePath of expandedPaths) {
    const dimensions = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`)
      .toString()
      .split(/(: |\n)/g);
    const oldWidth = parseInt(dimensions[4]);
    const oldHeight = parseInt(dimensions[8]);

    if (imagePath.toLowerCase().endsWith(".webp")) {
      // Convert to PNG, apply padding, then restore to WebP
      resultPaths.push(
        await execSIPSCommandOnWebP(
          `sips --padToHeightWidth ${oldHeight + padding} ${oldWidth + padding} --padColor ${color}`,
          imagePath,
        ),
      );
    } else if (imagePath.toLowerCase().endsWith(".svg")) {
      // Convert to PNG, apply padding, then restore to SVG
      resultPaths.push(
        await execSIPSCommandOnSVG(
          `sips --padToHeightWidth ${oldHeight + padding} ${oldWidth + padding} --padColor ${color}`,
          imagePath,
        ),
      );
    } else if (imagePath.toLowerCase().endsWith(".avif")) {
      // Convert to PNG, apply padding, then restore to AVIF
      resultPaths.push(
        await execSIPSCommandOnAVIF(
          `sips --padToHeightWidth ${oldHeight + padding} ${oldWidth + padding} --padColor ${color}`,
          imagePath,
        ),
      );
    } else {
      // Image is not a special format, so pad using SIPS
      const newPath = newPaths[expandedPaths.indexOf(imagePath)];
      resultPaths.push(newPath);

      execSync(
        `sips --padToHeightWidth ${oldHeight + padding} ${
          oldWidth + padding
        } --padColor ${color} -o "${newPath}" "${imagePath}"`,
      );
    }
  }

  await moveImageResultsToFinalDestination(resultPaths);
  return resultPaths;
}
