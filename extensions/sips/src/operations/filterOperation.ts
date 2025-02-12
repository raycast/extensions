/**
 * @file operations/filterOperation.ts
 *
 * @summary Image filter operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-dd 00:32:49
 */

import { applyBasicFilter } from "../utilities/filters";
import { Filter } from "../utilities/types";
import { getDestinationPaths, moveImageResultsToFinalDestination } from "../utilities/utils";

/**
 * Applies the specified filter to images, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to convert.
 * @param filter The filter to apply to the images.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function applyFilter(sourcePaths: string[], filter: Filter) {
  const resultPaths = [];
  for (const imageFilePath of sourcePaths) {
    const newPath = (
      await getDestinationPaths([imageFilePath], false, imageFilePath.endsWith(".pdf") ? "pdf" : "png")
    )[0];
    await applyBasicFilter(imageFilePath, newPath, filter);
    resultPaths.push(newPath);
  }

  await moveImageResultsToFinalDestination(resultPaths);
}
