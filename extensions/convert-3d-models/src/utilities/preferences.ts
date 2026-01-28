/**
 * @file utilities/preferences.ts
 *
 * @summary Preferences for the extension as a whole and for individual commands.
 * @author Felix Jen <felix@fjlaboratories.com>
 *
 * Created at     : 2024-01-12 17:00:00
 * Last modified  : 2024-01-12 17:00:00
 */

/**
 * Preferences for the extension as a whole.
 */

/**
 * Preferences for the convert command. Specifies which model formats to show in the conversion formats list.
 */
export interface ConvertPreferences {
  show3MF: boolean;
  showAMF: boolean;
  showBRP: boolean;
  showDAE: boolean;
  showIGS: boolean;
  showIV: boolean;
  showOBJ: boolean;
  showOFF: boolean;
  showPLY: boolean;
  showSMF: boolean;
  showSTL: boolean;
  showSTEP: boolean;
  showX3D: boolean;
  showX3DZ: boolean;
  [key: string]: boolean;
}
