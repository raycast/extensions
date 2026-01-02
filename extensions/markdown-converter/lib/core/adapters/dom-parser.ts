/**
 * Abstract DOM parser interface for platform-agnostic HTML parsing.
 */
export interface DOMParserAdapter {
  /**
   * Parse HTML string into a Document object.
   * @param html The HTML string to parse
   * @param type The MIME type (typically 'text/html')
   * @returns Parsed Document object
   */
  parseFromString(html: string, type: string): Document;
}