/**
 * @file operations/resizeOperation.ts
 *
 * @summary Image resizing operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:31:23
 * Last modified  : 2024-06-26 21:37:46
 */

import { execSync } from "child_process";
import path from "path";

import {
  execSIPSCommandOnAVIF,
  execSIPSCommandOnSVG,
  execSIPSCommandOnWebP,
  getDestinationPaths,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";

/**
 * Resizes images to the specified width and height, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to resize.
 * @param width The width to resize the images to, or -1 if the width should be automatically calculated.
 * @param height The height to resize the images to, or -1 if the height should be automatically calculated.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function resize(sourcePaths: string[], width: number, height: number) {
  const pathStrings = '"' + sourcePaths.join('" "') + '"';
  const newPaths = await getDestinationPaths(sourcePaths);

  if (
    pathStrings.toLocaleLowerCase().includes("webp") ||
    pathStrings.toLocaleLowerCase().includes("svg") ||
    pathStrings.toLocaleLowerCase().includes("avif")
  ) {
    // Special formats in selection -- Handle each image individually
    const resultPaths = [];
    for (const imgPath of sourcePaths) {
      if (imgPath.toLowerCase().endsWith(".webp")) {
        // Convert to PNG, rotate and restore to WebP
        if (width != -1 && height == -1) {
          resultPaths.push(await execSIPSCommandOnWebP(`sips --resampleWidth ${width}`, imgPath));
        } else if (width == -1 && height != -1) {
          resultPaths.push(await execSIPSCommandOnWebP(`sips --resampleHeight ${height}`, imgPath));
        } else {
          resultPaths.push(await execSIPSCommandOnWebP(`sips --resampleHeightWidth ${height} ${width}`, imgPath));
        }
      } else if (imgPath.toLowerCase().endsWith(".svg")) {
        // Convert to PNG, resize, and restore to WebP
        if (width != -1 && height == -1) {
          resultPaths.push(await execSIPSCommandOnSVG(`sips --resampleWidth ${width}`, imgPath));
        } else if (width == -1 && height != -1) {
          resultPaths.push(await execSIPSCommandOnSVG(`sips --resampleHeight ${height}`, imgPath));
        } else {
          resultPaths.push(await execSIPSCommandOnSVG(`sips --resampleHeightWidth ${height} ${width}`, imgPath));
        }
      } else if (imgPath.toLowerCase().endsWith(".avif")) {
        // Convert to PNG, resize, and restore to AVIF
        if (width != -1 && height == -1) {
          resultPaths.push(await execSIPSCommandOnAVIF(`sips --resampleWidth ${width}`, imgPath));
        } else if (width == -1 && height != -1) {
          resultPaths.push(await execSIPSCommandOnAVIF(`sips --resampleHeight ${height}`, imgPath));
        } else {
          resultPaths.push(await execSIPSCommandOnAVIF(`sips --resampleHeightWidth ${height} ${width}`, imgPath));
        }
      } else {
        // Image is not a special format, so just rotate it using SIPS
        const newPath = newPaths[sourcePaths.indexOf(imgPath)];
        resultPaths.push(newPath);

        if (width != -1 && height == -1) {
          execSync(`sips --resampleWidth ${width} -o "${newPath}" "${imgPath}"`);
        } else if (width == -1 && height != -1) {
          execSync(`sips --resampleHeight ${height} -o "${newPath}" "${imgPath}"`);
        } else {
          execSync(`sips --resampleHeightWidth ${height} -o "${newPath}" ${width} "${imgPath}"`);
        }
      }
    }
    await moveImageResultsToFinalDestination(resultPaths);
  } else {
    // No special formats -- Run commands on all images at once
    const outputLocation = newPaths.length == 1 ? newPaths[0] : path.join(path.dirname(newPaths[0]), "resized");

    if (newPaths.length > 1) execSync(`mkdir -p "${outputLocation}"`);

    if (width != -1 && height == -1) {
      execSync(`sips --resampleWidth ${width} -o "${outputLocation}" ${pathStrings}`);
    } else if (width == -1 && height != -1) {
      execSync(`sips --resampleHeight ${height} -o "${outputLocation}" ${pathStrings}`);
    } else {
      execSync(`sips --resampleHeightWidth ${height} ${width} -o "${outputLocation}" ${pathStrings}`);
    }
    await moveImageResultsToFinalDestination(newPaths);
  }
}
