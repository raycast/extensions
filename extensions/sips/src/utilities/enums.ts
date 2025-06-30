/**
 * @file utilities/enums.ts
 *
 * @summary Enumerations used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 00:52:09
 * Last modified  : 2024-06-26 21:37:46
 */

/**
 * Directions for flipping images.
 */
export enum Direction {
  HORIZONTAL = 0,
  VERTICAL = 1,
}

/**
 * The source of the input image(s).
 */
export enum ImageInputSource {
  FinderSelection = "Finder",
  PathFinderSelection = "Path Finder",
  NeoFinderSelection = "NeoFinder",
  HoudahSpotSelection = "HoudahSpot",
  QSpaceSelection = "QSpace Pro",
  ForkLiftSelection = "ForkLift",
  Clipboard = "Clipboard",
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
