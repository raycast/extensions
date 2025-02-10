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
  getDestinationPaths,
  getScopedTempFile,
  getWebPBinaryPath,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";
import { getAVIFEncPaths } from "../utilities/avif";
import { runAppleScript } from "@raycast/utils";
import { environment, getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../utilities/preferences";

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
 * Optimizes a WebP image by applying lossless compression (if the amount is less than 75) or lossy compression (if the amount is 75 or greater).
 *
 * @param webpPath The path of the WebP image to optimize.
 * @param amount The amount of compression to apply to the JPEG image.
 * @returns The path of the optimized WebP image.
 */
const optimizeWEBP = async (webpPath: string, amount: number) => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const optimizedPath = `${path.dirname(webpPath)}/${path.basename(webpPath, path.extname(webpPath))} (Optimized).webp`;
  const newPath = (await getDestinationPaths([optimizedPath]))[0];

  const [, cwebpPath] = await getWebPBinaryPath();
  execSync(
    `${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} -q ${amount} "${webpPath}" -o "${newPath}"`,
  );
  return newPath;
};

/**
 * Optimize SVG images using SVGO.
 *
 * @param svgPath The path of the SVG image to optimize.
 * @returns The path of the optimized SVG image.
 */
const optimizeSVG = async (svgPath: string) => {
  const optimizedPath = `${path.dirname(svgPath)}/${path.basename(svgPath, path.extname(svgPath))} (Optimized).svg`;
  const newPath = (await getDestinationPaths([optimizedPath]))[0];

  const data = fs.readFileSync(svgPath);
  const result = svgoOptimize(data.toString(), {
    path: newPath,
    multipass: true,
  });
  fs.writeFileSync(newPath, result.data);
  return newPath;
};

const optimizePNG = async (pngPath: string, optimizationAmount: number) => {
  const strategy = Math.floor(5 - optimizationAmount / 20);
  const optimizedPath = `${path.dirname(pngPath)}/${path.basename(pngPath, path.extname(pngPath))} (Optimized).png`;
  const newPath = (await getDestinationPaths([optimizedPath]))[0];

  const pngoutPath = `${environment.assetsPath}/pngout/pngout`;
  execSync(`chmod +x ${pngoutPath}`);
  execSync(`${pngoutPath} -s${strategy} -y -force "${pngPath}" "${newPath}"`);
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
      const preferences = getPreferenceValues<ExtensionPreferences>();
      const { encoderPath, decoderPath } = await getAVIFEncPaths();

      // Convert to JPEG
      await using jpegFile = await getScopedTempFile("tmp", "jpeg");
      execSync(`${decoderPath} -q ${amount} "${imgPath}" "${jpegFile.path}"`);

      // Convert back to AVIF
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).avif");
      resultPaths.push(newPath);
      execSync(
        `${encoderPath} ${preferences.useLosslessConversion ? "-s 0 --min 0 --max 0 --minalpha 0 --maxalpha 0 --qcolor 100 --qalpha 100" : ""} "${jpegFile.path}" "${newPath}"`,
      );
    } else if (imgPath.toLowerCase().endsWith("pdf")) {
      // PDF -> JPEG -> PDF
      throw new Error(
        "PDF optimization is not yet supported in this version of the extension, but it will be added in a future update.",
      );
    } else if (
      imgPath.toLowerCase().endsWith("png") ||
      imgPath.toLowerCase().endsWith("gif") ||
      imgPath.toLowerCase().endsWith("bmp") ||
      imgPath.toLowerCase().endsWith("tga")
    ) {
      resultPaths.push(await optimizePNG(imgPath, amount));
    } else {
      // Optimize any other SIPS-compatible image type
      await using jpegFile = await getScopedTempFile("tmp", "jpeg");
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(
        path.dirname(newPath),
        path.basename(newPath, path.extname(newPath)) + " (Optimized)" + path.extname(newPath),
      );
      resultPaths.push(newPath);

      await optimizeJPEG(imgPath, jpegFile.path, amount);
      const format = path.extname(newPath).slice(1).toLowerCase();
      execSync(`sips --setProperty format ${format} "${jpegFile.path}" --out "${newPath}"`);
    }
  }
  await moveImageResultsToFinalDestination(resultPaths);
}
