/**
 * @file operations/convertOperation.ts
 *
 * @summary Image conversion operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-dd 00:19:37
 * Last modified  : 2023-07-dd 00:19:37
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import path from "path";

import { environment, getPreferenceValues } from "@raycast/api";

import { convertPDF, convertSVG, moveImageResultsToFinalDestination } from "../utilities/utils";
import { ExtensionPreferences } from "../utilities/preferences";
import { ImageResultHandling } from "../utilities/enums";

/**
 * Converts images to the specified format, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to convert.
 * @param desiredType The desired format to convert the images to.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function convert(sourcePaths: string[], desiredType: string) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const resultPaths = [];
  for (const item of sourcePaths) {
    const originalType = path.extname(item).slice(1);
    let newPath = path.join(path.dirname(item), path.basename(item, originalType) + desiredType.toLowerCase());

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
        path.basename(newPath, `.${desiredType.toLowerCase()}`) + ` (${iter})${path.extname(newPath)}`
      );
      iter++;
    }

    if (desiredType === "WEBP") {
      // Input Format -> WebP
      execSync(`chmod +x ${environment.assetsPath}/webp/cwebp`);
      execSync(`${environment.assetsPath}/webp/cwebp "${item}" -o "${newPath}"`);
    } else if (originalType.toLowerCase() == "svg") {
      // SVG -> NSBitmapImageRep -> Desired Format
      convertSVG(desiredType, item, newPath);
    } else if (desiredType == "SVG") {
      const bmpPath = `${environment.supportPath}/tmp.bmp`;
      execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
      if (originalType.toLowerCase() == "webp") {
        // WebP -> PNG -> BMP -> SVG
        const pngPath = `${environment.supportPath}/tmp.png`;
        execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);
        execSync(`${environment.assetsPath}/webp/dwebp "${item}" -o "${pngPath}"`);
        execSync(
          `sips --setProperty format "bmp" "${pngPath}" --out "${bmpPath}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpPath}"; rm "${bmpPath}"; rm "${pngPath}"`
        );
      } else {
        // Input Format -> BMP -> SVG
        execSync(
          `sips --setProperty format "bmp" "${item}" --out "${bmpPath}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpPath}"; rm "${bmpPath}"`
        );
      }
    } else if (originalType.toLowerCase() == "webp") {
      // WebP -> Desired Format
      execSync(`chmod +x ${environment.assetsPath}/webp/dwebp`);
      execSync(`${environment.assetsPath}/webp/dwebp "${item}" -o "${newPath}"`);
    } else if (originalType.toLowerCase() == "pdf") {
      // PDF -> Desired Format
      const itemName = path.basename(item);
      const folderName = `${itemName?.substring(0, itemName.lastIndexOf("."))} ${desiredType}`;
      const folderPath = path.join(newPath.split("/").slice(0, -1).join("/"), folderName);
      execSync(`mkdir -p "${folderPath}"`);
      convertPDF(desiredType, item, folderPath);
    } else {
      // General Input Format -> Desired Format
      execSync(`sips --setProperty format ${desiredType.toLowerCase()} "${item}" --out "${newPath}"`);
    }

    resultPaths.push(newPath);
  }

  await moveImageResultsToFinalDestination(resultPaths);
}
