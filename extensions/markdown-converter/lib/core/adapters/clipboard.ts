/**
 * Abstract clipboard interface for platform-agnostic clipboard operations.
 */
export interface ClipboardAdapter {
  /**
   * Read HTML content from the clipboard.
   * @returns Promise resolving to HTML string or null if not available
   */
  readHtml(): Promise<string | null>;

  /**
   * Read plain text content from the clipboard.
   * @returns Promise resolving to text string or null if not available
   */
  readText(): Promise<string | null>;

  /**
   * Write text content to the clipboard.
   * @param text The text to write to clipboard
   */
  writeText(text: string): Promise<void>;
}