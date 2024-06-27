/**
 * @file operations/optimizeOperation.ts
 *
 * @summary Image optimization operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:49:16
 * Last modified  : 2024-06-26 21:37:46
 */

import { execSync } from "child_process";
import * as fs from "fs";
import path from "path";
import { optimize as svgoOptimize } from "svgo";

import {
  cleanup,
  getDestinationPaths,
  getWebPBinaryPath,
  moveImageResultsToFinalDestination,
  scopedTempFile,
} from "../utilities/utils";
import { getAVIFEncPaths } from "../utilities/avif";
import { runAppleScript } from "@raycast/utils";

/**
 * Optimizes a JPEG image by applying lossy compression.
 *
 * @param jpegPath The path of the JPEG image to optimize.
 * @param newPath The path to save the optimized JPEG image to.
 * @param amount The amount of compression to apply to the JPEG image.
 */
const optimizeJPEG = async (jpegPath: string, newPath: string, amount: number) => {
  return runAppleScript(`use framework "Foundation"
  
    -- Load JPEG image from file
    set jpegData to current application's NSData's alloc()'s initWithContentsOfFile:"${jpegPath}"
    
    -- Create bitmap image representation from image
    set bitmapRep to current application's NSBitmapImageRep's imageRepWithData:jpegData
    
    -- Compress bitmap representation
    set compressionFactor to ${1.0 - amount / 100.0}
    set compressedData to bitmapRep's representationUsingType:(current application's NSBitmapImageFileTypeJPEG) |properties|:{NSImageCompressionFactor:compressionFactor}
    
    -- Save compressed data to file
    set compressedFilePath to "${newPath}"
    compressedData's writeToFile:compressedFilePath atomically:false`);
};

/**
 * Optimizes a WebP image by converting it to a JPEG, optimizing the JPEG, and then converting it back to a WebP.
 *
 * @param webpPath The path of the WebP image to optimize.
 * @param amount The amount of compression to apply to the JPEG image.
 * @returns The path of the optimized WebP image.
 */
const optimizeWEBP = async (webpPath: string, amount: number) => {
  const jpegPath = await scopedTempFile("tmp", "jpeg");

  let newPath = (await getDestinationPaths([webpPath]))[0];
  newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).webp");

  const [dwebpPath, cwebpPath] = await getWebPBinaryPath();

  execSync(`${dwebpPath} "${webpPath}" -o "${jpegPath}"`);
  await optimizeJPEG(jpegPath, newPath, amount);
  execSync(`${cwebpPath} "${jpegPath}" -o "${newPath}"`);
  return newPath;
};

/**
 * Optimize SVG images using SVGO.
 *
 * @param svgPath The path of the SVG image to optimize.
 * @returns The path of the optimized SVG image.
 */
const optimizeSVG = async (svgPath: string) => {
  let newPath = (await getDestinationPaths([svgPath]))[0];
  newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).svg");

  const data = fs.readFileSync(svgPath);
  const result = svgoOptimize(data.toString(), {
    path: newPath,
    multipass: true,
  });
  fs.writeFileSync(newPath, result.data);
  return newPath;
};

/**
 * Optimize images using format-specific strategies, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to optimize.
 * @param amount The level of optimization to apply, from 0 to 100.
 * @returns A promise that resolves when optimization is complete.
 */
export default async function optimize(sourcePaths: string[], amount: number) {
  const newPaths = await getDestinationPaths(sourcePaths);

  const resultPaths = [];
  for (const imgPath of sourcePaths) {
    if (imgPath.toLowerCase().endsWith("webp")) {
      // Convert to JPEG, optimize, and restore to WebP
      resultPaths.push(await optimizeWEBP(imgPath, amount));
    } else if (imgPath.toLowerCase().endsWith("svg")) {
      // Optimize SVG using SVGO
      resultPaths.push(await optimizeSVG(imgPath));
    } else if (imgPath.toLowerCase().endsWith("jpg") || imgPath.toLowerCase().endsWith("jpeg")) {
      // Optimize JPEG images using NSBitmapImageRep compression
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).jpeg");
      resultPaths.push(newPath);
      await optimizeJPEG(imgPath, newPath, amount);
    } else if (imgPath.toLowerCase().endsWith("avif")) {
      // Optimize AVIF images using avifenc
      const { encoderPath, decoderPath } = await getAVIFEncPaths();

      // Convert to JPEG
      const jpegPath = await scopedTempFile("tmp", "jpeg");
      execSync(`${decoderPath} -q ${amount} "${imgPath}" "${jpegPath}"`);

      // Convert back to AVIF
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).avif");
      resultPaths.push(newPath);
      execSync(`${encoderPath} "${jpegPath}" "${newPath}"`);
    } else if (imgPath.toLowerCase().endsWith("pdf")) {
      // PDF -> JPEG -> PDF
      throw new Error(
        "PDF optimization is not yet supported in this version of the extension, but it will be added in a future update.",
      );
    } else {
      // Optimize any other SIPS-compatible image type
      const jpegPath = await scopedTempFile("tmp", "jpeg");
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).jpeg");
      resultPaths.push(newPath);

      await optimizeJPEG(imgPath, jpegPath, amount);
      execSync(`sips --setProperty format jpeg "${jpegPath}" --out "${newPath}"`);
    }
  }
  await moveImageResultsToFinalDestination(resultPaths);
  await cleanup();
}
