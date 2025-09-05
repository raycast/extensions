import { Clipboard } from "@raycast/api";

/**
 * Clipboard management utilities for URL extraction
 */
export class ClipboardManager {
  /**
   * URL regex pattern to match HTTP/HTTPS URLs
   */
  private static readonly URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

  /**
   * Reads clipboard content and extracts the first valid URL
   * @returns Promise<string | null> - First valid URL found or null if none
   */
  static async extractUrl(): Promise<string | null> {
    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText || clipboardText.trim() === "") {
        return null;
      }

      // Find all URLs in the clipboard text
      const urls = clipboardText.match(this.URL_REGEX);

      if (!urls || urls.length === 0) {
        return null;
      }

      // Return the first valid URL found
      const firstUrl = urls[0].trim();
      return this.isValidUrl(firstUrl) ? firstUrl : null;
    } catch (error) {
      console.error("Error reading clipboard:", error);
      return null;
    }
  }

  /**
   * Validates if a string is a properly formatted URL
   * @param url - URL string to validate
   * @returns boolean - true if valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Checks if clipboard contains any valid URLs
   * @returns Promise<boolean> - true if clipboard contains valid URLs
   */
  static async hasValidUrl(): Promise<boolean> {
    const url = await this.extractUrl();
    return url !== null;
  }
}
