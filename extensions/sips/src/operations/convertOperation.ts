/**
 * @file operations/convertOperation.ts
 *
 * @summary Image conversion operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-dd 00:19:37
 * Last modified  : 2024-06-26 21:37:46
 */

import { execSync } from "child_process";
import path from "path";

import { environment, getPreferenceValues } from "@raycast/api";

import {
  addItemToRemove,
  convertPDF,
  convertSVG,
  getDestinationPaths,
  getScopedTempFile,
  getWebPBinaryPath,
  moveImageResultsToFinalDestination,
} from "../utilities/utils";
import { getAVIFEncPaths } from "../utilities/avif";
import { readdirSync } from "fs";
import { ConvertPreferences, ExtensionPreferences } from "../utilities/preferences";

/**
 * Converts images to the specified format, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to convert.
 * @param desiredType The desired format to convert the images to.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function convert(
  sourcePaths: string[],
  desiredType: string,
  outputPaths?: string[],
  intermediate = false,
) {
  const preferences = getPreferenceValues<ConvertPreferences & ExtensionPreferences>();
  const resultPaths = [];
  for (const [index, item] of sourcePaths.entries()) {
    const originalType = path.extname(item).slice(1);
    const newType = desiredType === "JPEG" ? preferences.jpegExtension : desiredType.toLowerCase();
    const newPath = outputPaths?.[index] || (await getDestinationPaths([item], false, newType))[0];

    if (desiredType === "WEBP" && originalType.toLowerCase() !== "svg") {
      // Input Format -> WebP
      const [, cwebpPath] = await getWebPBinaryPath();
      if (originalType.toLowerCase() == "avif") {
        // AVIF -> PNG -> WebP
        const { decoderPath } = await getAVIFEncPaths();
        await using pngFile = await getScopedTempFile("tmp", "png");
        execSync(`${decoderPath} "${item}" "${pngFile.path}"`);
        execSync(
          `${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${pngFile.path}" -o "${newPath}"`,
        );
      } else if (originalType.toLowerCase() == "pdf") {
        // PDF -> PNG -> WebP
        const folderPath = path.join(
          newPath.split("/").slice(0, -1).join("/"),
          path.basename(newPath, ".webp") + " WebP",
        );
        execSync(`mkdir -p "${folderPath}"`);
        await convertPDF("PNG", item, folderPath);

        const pngFiles = readdirSync(folderPath).map((file) => path.join(folderPath, file));
        for (const pngFile of pngFiles) {
          execSync(
            `${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${pngFile}" -o "${pngFile.replace(".png", ".webp")}"`,
          );
          await addItemToRemove(pngFile);
        }
      } else {
        execSync(`${cwebpPath} ${preferences.useLosslessConversion ? "-lossless" : ""} "${item}" -o "${newPath}"`);
      }
    } else if (originalType.toLowerCase() == "svg") {
      if (["AVIF", "PDF", "WEBP"].includes(desiredType)) {
        // SVG -> PNG -> AVIF, PDF, or WebP
        await using pngFile = await getScopedTempFile("tmp", "png");
        await convertSVG("PNG", item, pngFile.path);
        await convert([pngFile.path], desiredType, [newPath]);
        return;
      } else {
        // SVG -> NSBitmapImageRep -> Desired Format
        await convertSVG(desiredType, item, newPath);
        await convert([newPath], desiredType, [newPath]);
        return;
      }
    } else if (desiredType == "SVG") {
      await using bmpFile = await getScopedTempFile("tmp", "bmp");
      execSync(`chmod +x ${environment.assetsPath}/potrace/potrace`);
      if (originalType.toLowerCase() == "webp") {
        // WebP -> PNG -> BMP -> SVG
        // const pngPath = await scopedTempFile("tmp", "png");
        await using pngFile = await getScopedTempFile("tmp", "png");
        const [dwebpPath] = await getWebPBinaryPath();
        execSync(`${dwebpPath} "${item}" -o "${pngFile.path}"`);
        execSync(
          `sips --setProperty format "bmp" "${pngFile.path}" --out "${bmpFile.path}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpFile.path}"`,
        );
      } else if (originalType.toLowerCase() == "pdf") {
        // PDF -> PNG -> BMP -> SVG
        const folderPath = path.join(
          newPath.split("/").slice(0, -1).join("/"),
          path.basename(newPath, ".svg") + " SVG",
        );
        execSync(`mkdir -p "${folderPath}"`);
        await convertPDF("PNG", item, folderPath);

        const pngFiles = readdirSync(folderPath).map((file) => path.join(folderPath, file));
        for (const pngFile of pngFiles) {
          execSync(
            `sips --setProperty format "bmp" "${pngFile}" --out "${bmpFile.path}" && ${
              environment.assetsPath
            }/potrace/potrace -s --tight -o "${pngFile.replace(".png", ".svg")}" "${bmpFile.path}"`,
          );
          await addItemToRemove(pngFile);
        }
      } else {
        // Input Format -> BMP -> SVG
        execSync(
          `sips --setProperty format "bmp" "${item}" --out "${bmpFile.path}" && ${environment.assetsPath}/potrace/potrace -s --tight -o "${newPath}" "${bmpFile.path}"`,
        );
      }
    } else if (desiredType == "AVIF") {
      // Input Format -> PNG -> AVIF
      const { encoderPath } = await getAVIFEncPaths();
      if (originalType.toLowerCase() == "pdf") {
        // PDF -> PNG -> AVIF
        const folderPath = path.join(
          newPath.split("/").slice(0, -1).join("/"),
          path.basename(newPath, ".avif") + " AVIF",
        );
        execSync(`mkdir -p "${folderPath}"`);
        await convertPDF("PNG", item, folderPath);

        const pngFiles = readdirSync(folderPath)
          .map((file) => path.join(folderPath, file))
          .filter((file) => file.endsWith(".png"));
        for (const pngFile of pngFiles) {
          execSync(
            `${encoderPath} ${preferences.useLosslessConversion ? "-s 0 --min 0 --max 0 --minalpha 0 --maxalpha 0 --qcolor 100 --qalpha 100" : ""} "${pngFile}" "${pngFile.replace(".png", ".avif")}"`,
          );
          await addItemToRemove(pngFile);
        }
      } else {
        await using pngFile = await getScopedTempFile("tmp", "png");
        await convert([item], "PNG", [pngFile.path], true);
        execSync(
          `${encoderPath} ${preferences.useLosslessConversion ? "-s 0 --min 0 --max 0 --minalpha 0 --maxalpha 0 --qcolor 100 --qalpha 100" : ""} "${pngFile.path}" "${newPath}"`,
        );
      }
    } else if (originalType.toLowerCase() == "webp") {
      // WebP -> PNG -> Desired Format
      const [dwebpPath] = await getWebPBinaryPath();
      execSync(`${dwebpPath} "${item}" -o "${newPath}"`);
      execSync(`sips --setProperty format ${desiredType.toLowerCase()} "${newPath}"`);
    } else if (originalType.toLowerCase() == "pdf") {
      // PDF -> Desired Format
      const itemName = path.basename(item);
      const folderName = `${itemName?.substring(0, itemName.lastIndexOf("."))} ${desiredType}`;
      const folderPath = path.join(newPath.split("/").slice(0, -1).join("/"), folderName);
      execSync(`mkdir -p "${folderPath}"`);
      await convertPDF(desiredType, item, folderPath);
    } else if (originalType.toLowerCase() == "avif") {
      // AVIF -> PNG -> Desired Format
      const { decoderPath } = await getAVIFEncPaths();
      await using pngFile = await getScopedTempFile("tmp", "png");
      execSync(`${decoderPath} "${item}" "${pngFile.path}"`);
      await convert([pngFile.path], desiredType, [newPath]);
      return;
    } else {
      // General Input Format -> Desired Format
      execSync(`sips --setProperty format ${desiredType.toLowerCase()} "${item}" --out "${newPath}"`);
    }

    resultPaths.push(newPath);
  }

  if (!intermediate) {
    await moveImageResultsToFinalDestination(resultPaths);
  }
}
