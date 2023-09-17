/**
 * @file operations/filterOperation.ts
 *
 * @summary Image filter operation with support for basic image formats, SVGs, WebP, and PDFs.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-dd 00:32:49
 * Last modified  : 2023-07-dd 00:32:49
 */

import fs from "fs";
import os from "os";
import path from "path";

import { getPreferenceValues } from "@raycast/api";

import { Filter } from "../utilities/types";
import { moveImageResultsToFinalDestination } from "../utilities/utils";
import { ExtensionPreferences } from "../utilities/preferences";
import { ImageResultHandling } from "../utilities/enums";

/**
 * Applies the specified filter to images, storing the results according to the user's preferences.
 *
 * @param sourcePaths The paths of the images to convert.
 * @param filter The filter to apply to the images.
 * @returns A promise that resolves when the operation is complete.
 */
export default async function applyFilter(sourcePaths: string[], filter: Filter) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const resultPaths = [];
  for (const imageFilePath of sourcePaths) {
    let newPath = path.join(
      path.dirname(imageFilePath),
      path.basename(imageFilePath, path.extname(imageFilePath)) + (imageFilePath.endsWith(".pdf") ? ".pdf" : ".png")
    );

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

    // Ensure that the file name is unique, unless the user wants to replace the original
    if (
      preferences.imageResultHandling != ImageResultHandling.ReplaceOriginal &&
      os.tmpdir() != path.dirname(newPath)
    ) {
      let iter = 2;
      while (fs.existsSync(newPath) && os.tmpdir() != path.dirname(newPath)) {
        newPath = path.join(
          path.dirname(newPath),
          path.basename(newPath, path.extname(newPath)) + ` ${iter}` + path.extname(newPath)
        );
        iter++;
      }
    }
    await filter.applyMethod(imageFilePath, newPath, filter.CIFilterName);
    resultPaths.push(newPath);
  }

  await moveImageResultsToFinalDestination(resultPaths);
}
