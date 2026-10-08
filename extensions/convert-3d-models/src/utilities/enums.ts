/**
 * @file utilities/enums.ts
 *
 * @summary Enumerations used throughout the extension.
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */

/**
 * Strategy for handling the result of the model processing, i.e. where to save or display the result.
 */
export enum ModelResultHandling {
  ReplaceOriginal = "replaceOriginal",
  SaveInContainingFolder = "saveInContainingFolder",
  CopyToClipboard = "copyToClipboard",
  OpenInPreview = "openInPreview",
  SaveToDownloads = "saveToDownloads",
  SaveToDesktop = "saveToDesktop",
}
