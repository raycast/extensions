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
export interface ExtensionPreferences {
    /**
     * The source of input models -- either "Clipboard" or the name of a file manager (e.g. "Finder" or "Path Finder").
     */
    inputMethod: string;
    freeCADPath: string;
  
    /**
     * The strategy for handling the result of the model processing, i.e. where to save or display the result. One of {@link ModelResultHandling}.
     */
    modelResultHandling: string;
  }
  
  /**
   * Preferences for the convert command. Specifies which model formats to show in the conversion formats list.
   */
  export interface ConvertPreferences {
    showSTEP: boolean;
    showSTL: boolean;
    showOBJ: boolean;
    show3MF: boolean;
    showIGS: boolean;
    showX3D: boolean;
    showX3DZ: boolean;
    [key: string]: boolean;
  }
