/**
 * @file utilities/enums.ts
 *
 * @summary Enumerations used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 00:52:09
 * Last modified  : 2023-07-06 15:48:29
 */

/**
 * Directions for flipping images.
 */
export enum Direction {
  HORIZONTAL = 0,
  VERTICAL = 1,
}

/**
 * Strategy for handling the result of the image processing, i.e. where to save or display the result.
 */
export enum ImageResultHandling {
  ReplaceOriginal = "replaceOriginal",
  SaveInContainingFolder = "saveInContainingFolder",
  CopyToClipboard = "copyToClipboard",
  OpenInPreview = "openInPreview",
  SaveToDownloads = "saveToDownloads",
  SaveToDesktop = "saveToDesktop",
}

/**
 * The place to look for the ExifTool binary.
 */
export enum ExifToolLocation {
  ON_PATH = "path",
  SUPPORT_DIR = "support",
}
