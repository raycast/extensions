/**
 * Type definitions for the Chibisafe uploader extension
 */

/**
 * Extension preferences
 */
export interface Preferences {
  apiKey: string;
  uploadUrl: string;
}

/**
 * Upload response from the Chibisafe API
 */
export interface UploadResponse {
  url: string;
  // Using a more specific type instead of any
  [key: string]: string | number | boolean | object | null;
}
