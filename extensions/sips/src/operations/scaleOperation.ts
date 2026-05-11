/**
 * @file operations/scaleOperation.ts
 *
 * @summary Image scaling operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:05:46
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
 * Scales images by the given scale factor, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to scale.
 * @param scaleFactor The factor by which to scale the images.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function scale(sourcePaths: string[], scaleFactor: number) {
  const expandedPaths = sourcePaths.map((path) => expandTilde(path));
  const newPaths = await getDestinationPaths(expandedPaths);
  const resultPaths: string[] = [];

  for (const imagePath of expandedPaths) {
    const dimensions = execSync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`)
      .toString()
      .split(/(: |\n)/g);
    const oldWidth = parseInt(dimensions[4]);
    const oldHeight = parseInt(dimensions[8]);

    if (imagePath.toLowerCase().endsWith("webp")) {
      // Convert to PNG, scale, the restore to WebP
      resultPaths.push(
        await execSIPSCommandOnWebP(
          `sips --resampleHeightWidth ${oldHeight * scaleFactor} ${oldWidth * scaleFactor}`,
          imagePath,
        ),
      );
    } else if (imagePath.toLowerCase().endsWith("svg")) {
      // Convert to PNG, scale, and restore to SVG
      resultPaths.push(
        await execSIPSCommandOnSVG(
          `sips --resampleHeightWidth ${oldHeight * scaleFactor} ${oldWidth * scaleFactor}`,
          imagePath,
        ),
      );
    } else if (imagePath.toLowerCase().endsWith("avif")) {
      // Convert to PNG, scale, and restore to AVIF
      resultPaths.push(
        await execSIPSCommandOnAVIF(
          `sips --resampleHeightWidth ${oldHeight * scaleFactor} ${oldWidth * scaleFactor}`,
          imagePath,
        ),
      );
    } else {
      // File is a normal image type
      const newPath = newPaths[expandedPaths.indexOf(imagePath)];
      resultPaths.push(newPath);
      execSync(
        `sips --resampleHeightWidth ${oldHeight * scaleFactor} ${oldWidth * scaleFactor} -o "${newPath}" "${imagePath}"`,
      );
    }
  }

  await moveImageResultsToFinalDestination(resultPaths);
  return resultPaths;
}
