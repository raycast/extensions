/**
 * @file utilities/preferences.ts
 *
 * @summary Preferences for the extension as a whole and for individual commands.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 15:34:53
 * Last modified  : 2024-06-26 21:37:46
 */

/**
 * Preferences for the extension as a whole.
 */
export interface ExtensionPreferences {
  /**
   * The source of input images -- either "Clipboard" or the name of a file manager (e.g. "Finder" or "Path Finder").
   */
  inputMethod: string;

  /**
   * The strategy for handling the result of the image processing, i.e. where to save or display the result. One of {@link ImageResultHandling}.
   */
  imageResultHandling: string;

  /**
   * Whether to use lossless conversion when operating on WebP and AVIF images.
   */
  useLosslessConversion: boolean;
}

/**
 * Preferences for the convert command. Specifies which image formats to show in the conversion formats list.
 */
export interface ConvertPreferences {
  showASTC: boolean;
  showAVIF: boolean;
  showBMP: boolean;
  showDDS: boolean;
  showEXR: boolean;
  showGIF: boolean;
  showHEIC: boolean;
  showHEICS: boolean;
  showICNS: boolean;
  showICO: boolean;
  showJPEG: boolean;
  showJP2: boolean;
  showKTX: boolean;
  showPBM: boolean;
  showPDF: boolean;
  showPNG: boolean;
  showPSD: boolean;
  showPVR: boolean;
  showTGA: boolean;
  showTIFF: boolean;
  showWEBP: boolean;
  showSVG: boolean;
  jpegExtension: string;
  [key: string]: boolean | string;
}

/**
 * Preferences for the rotate command.
 */
export interface RotatePreferences {
  /**
   * The unit to use when specifying the rotation angle, either "degrees" or "radians".
   */
  rotationUnit: string;
}

/**
 * Preferences for the pad command.
 */
export interface PadPreferences {
  /**
   * The default color to use when padding images and no color argument is provided.
   */
  defaultPadColor: string;
}

/**
 * Preferences for the Create New Image command.
 */
export interface CreateImagePreferences {
  /**
   * Whether to generate previews for the image patterns.
   */
  generatePreviews: boolean;
}
