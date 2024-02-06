/**
 * @file operations/optimizeOperation.ts
 *
 * @summary Image optimization operation with support for basic image formats, SVGs, and WebP.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-05 23:49:16
 * Last modified  : 2023-07-06 14:51:57
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import path from "path";
import { runAppleScriptSync } from "run-applescript";
import { optimize as svgoOptimize } from "svgo";

import { environment, getPreferenceValues } from "@raycast/api";

import { getDestinationPaths, getWebPBinaryPath, moveImageResultsToFinalDestination } from "../utilities/utils";
import { ExtensionPreferences } from "../utilities/preferences";
import { ImageResultHandling } from "../utilities/enums";

/**
 * Optimizes a JPEG image by applying lossy compression.
 *
 * @param jpegPath The path of the JPEG image to optimize.
 * @param newPath The path to save the optimized JPEG image to.
 * @param amount The amount of compression to apply to the JPEG image.
 */
const optimizeJPEG = (jpegPath: string, newPath: string, amount: number) => {
  runAppleScriptSync(`use framework "Foundation"
  
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
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const jpegPath = `${environment.supportPath}/tmp.jpeg`;

  let newPath = webpPath.substring(0, webpPath.toLowerCase().lastIndexOf(".webp")) + " (Optimized).webp";
  if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
    newPath = path.join(os.homedir(), "Downloads", path.basename(newPath));
  } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
    newPath = path.join(os.homedir(), "Desktop", path.basename(newPath));
  } else if (
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
  ) {
    newPath = path.join(os.tmpdir(), path.basename(newPath));
  }

  let iter = 2;
  while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
    newPath = path.join(
      path.dirname(newPath),
      path.basename(newPath, path.extname(newPath)) + ` (${iter})${path.extname(newPath)}`
    );
    iter++;
  }

  execSync(`chmod +x ${environment.assetsPath}/webp/cwebp`);
  execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);

  const [dwebpPath, cwebpPath] = await getWebPBinaryPath();

  execSync(`${dwebpPath} "${webpPath}" -o "${jpegPath}"`);
  optimizeJPEG(jpegPath, newPath, amount);
  execSync(`${cwebpPath} "${jpegPath}" -o "${newPath}"; rm "${jpegPath}"`);
  return newPath;
};

/**
 * Optimize SVG images using SVGO.
 *
 * @param svgPath The path of the SVG image to optimize.
 * @returns The path of the optimized SVG image.
 */
const optimizeSVG = (svgPath: string) => {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  let newPath = svgPath.substring(0, svgPath.toLowerCase().lastIndexOf(".svg")) + " (Optimized).svg";
  if (preferences.imageResultHandling == ImageResultHandling.SaveToDownloads) {
    newPath = path.join(os.homedir(), "Downloads", path.basename(newPath));
  } else if (preferences.imageResultHandling == ImageResultHandling.SaveToDesktop) {
    newPath = path.join(os.homedir(), "Desktop", path.basename(newPath));
  } else if (
    preferences.imageResultHandling == ImageResultHandling.CopyToClipboard ||
    preferences.imageResultHandling == ImageResultHandling.OpenInPreview
  ) {
    newPath = path.join(os.tmpdir(), path.basename(newPath));
  }

  let iter = 2;
  while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
    newPath = path.join(
      path.dirname(newPath),
      path.basename(newPath, path.extname(newPath)) + ` (${iter})${path.extname(newPath)}`
    );
    iter++;
  }

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
  const newPaths = getDestinationPaths(sourcePaths);

  const resultPaths = [];
  for (const imgPath of sourcePaths) {
    if (imgPath.toLowerCase().endsWith("webp")) {
      // Convert to JPEG, optimize, and restore to WebP
      resultPaths.push(await optimizeWEBP(imgPath, amount));
    } else if (imgPath.toLowerCase().endsWith("svg")) {
      // Optimize SVG using SVGO
      resultPaths.push(optimizeSVG(imgPath));
    } else if (imgPath.toLowerCase().endsWith("jpg") || imgPath.toLowerCase().endsWith("jpeg")) {
      // Optimize JPEG images using NSBitmapImageRep compression
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).jpeg");
      resultPaths.push(newPath);
      optimizeJPEG(imgPath, newPath, amount);
    } else {
      // Optimize any other SIPS-compatible image type
      const jpegPath = `${environment.supportPath}/tmp.jpeg`;
      let newPath = newPaths[sourcePaths.indexOf(imgPath)];
      resultPaths.push(newPath);
      newPath = path.join(path.dirname(newPath), path.basename(newPath, path.extname(newPath)) + " (Optimized).jpeg");
      resultPaths.push(newPath);

      optimizeJPEG(imgPath, jpegPath, amount);
      execSync(`sips --setProperty format jpeg "${jpegPath}" --out "${newPath}"; rm "${jpegPath}"`);
    }
  }
  await moveImageResultsToFinalDestination(resultPaths);
}
