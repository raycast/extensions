/**
 * @file operations/rotateOperation.ts
 *
 * @summary Image rotation operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:24:24
 */

import { execSync } from "child_process";
import * as fs from "fs";
import path from "path";

import {
  execSIPSCommandOnAVIF,
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  expandTilde,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
  rotatePDF,
} from "../utilities/utils";

/**
 * Rotates images by the given amount of degrees, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to rotate.
 * @param degrees The amount of degrees to rotate the images.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function rotate(sourcePaths: string[], degrees: number) {
  const expandedPaths = sourcePaths.map((path) => expandTilde(path));
  const pathStrings = '"' + expandedPaths.join('" "') + '"';
  const newPaths = await getDestinationPaths(expandedPaths);

  if (
    pathStrings.toLowerCase().includes("webp") ||
    pathStrings.toLowerCase().includes("svg") ||
    pathStrings.toLowerCase().includes("pdf") ||
    pathStrings.toLowerCase().includes("avif")
  ) {
    // Special formats in selection -- Handle each image individually
    const resultPaths = [];
    for (const imgPath of expandedPaths) {
      if (imgPath.toLowerCase().endsWith("webp")) {
        // Convert to PNG, flip and restore to WebP
        resultPaths.push(await execSIPSCommandOnWebP(`sips --rotate ${degrees}`, imgPath));
      } else if (imgPath.toLowerCase().endsWith("svg")) {
        // Convert to PNG, rotate, and restore to SVG
        resultPaths.push(await execSIPSCommandOnSVG(`sips --rotate ${degrees}`, imgPath));
      } else if (imgPath.toLowerCase().endsWith("pdf")) {
        // Rotate each page of a PDF
        resultPaths.push(await rotatePDF(imgPath, degrees));
      } else if (imgPath.toLowerCase().endsWith("avif")) {
        // Convert to PNG, rotate, and restore to AVIF
        resultPaths.push(await execSIPSCommandOnAVIF(`sips --rotate ${degrees}`, imgPath));
      } else {
        // Image is not a special format, so just rotate it using SIPS
        const newPath = newPaths[expandedPaths.indexOf(imgPath)];
        resultPaths.push(newPath);
        execSync(`sips --rotate ${degrees} -o "${newPath}" "${imgPath}"`);
      }
    }
    await moveImageResultsToFinalDestination(resultPaths);
    return resultPaths;
  } else {
    // No special formats -- Flip all images at once
    if (newPaths.length == 1) {
      execSync(`sips --rotate ${degrees} -o "${newPaths[0]}" ${pathStrings}`);
    } else {
      let exportDir = path.join(path.dirname(newPaths[0]), "rotated");

      let iter = 1;
      while (fs.existsSync(exportDir)) {
        exportDir = exportDir + `-${iter}`;
        iter++;
      }

      await fs.promises.mkdir(exportDir, { recursive: true });
      execSync(`sips --rotate ${degrees} -o "${exportDir}" ${pathStrings}`);

      expandedPaths.forEach((imgPath, index) => {
        fs.renameSync(path.join(exportDir, path.basename(imgPath)), newPaths[index]);
      });

      await fs.promises.rm(exportDir, { recursive: true, force: true });
    }
    await moveImageResultsToFinalDestination(newPaths);
  }
  return newPaths;
}
