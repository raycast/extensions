import { parseHTML } from "linkedom";
import { ExtractedMetadata } from "../utils/metadata-extractor";

/**
 * Linkedom document type - use the actual type from parseHTML for full DOM API support.
 * This provides all standard DOM methods (querySelector, cloneNode, remove, etc.)
 */
export type ExtractorDocument = ReturnType<typeof parseHTML>["document"];

/**
 * Element type for queried elements - used by helper methods that work with
 * individual DOM elements rather than the full document.
 */
export type ExtractorElement = Element;

/**
 * Result returned by an extractor
 */
export interface ExtractorResult {
  /** The extracted HTML content */
  content: string;
  /** Plain text version of the content */
  textContent: string;
  /** Metadata extracted from the page */
  metadata: ExtractorMetadata;
}

/**
 * Metadata that can be extracted by site-specific extractors
 */
export interface ExtractorMetadata {
  title?: string;
  author?: string;
  siteName?: string;
  description?: string;
  published?: string;
  image?: string;
}

/**
 * Base class for site-specific content extractors.
 *
 * Extractors provide custom content extraction logic for sites that
 * don't work well with generic Readability parsing. Each extractor
 * can implement its own DOM traversal and content transformation.
 *
 * Usage:
 * 1. Extend this class
 * 2. Implement canExtract() to detect if this extractor should handle the page
 * 3. Implement extract() to return the extracted content
 */
export abstract class BaseExtractor {
  protected document: ExtractorDocument;
  protected url: string;
  protected schemaOrgData: Record<string, unknown> | null;
  protected existingMetadata: ExtractedMetadata | null;

  constructor(
    document: ExtractorDocument,
    url: string,
    schemaOrgData?: Record<string, unknown> | null,
    existingMetadata?: ExtractedMetadata | null,
  ) {
    this.document = document;
    this.url = url;
    this.schemaOrgData = schemaOrgData || null;
    this.existingMetadata = existingMetadata || null;
  }

  /**
   * Check if this extractor can handle the current page.
   * Should return true if the page structure matches what this extractor expects.
   */
  abstract canExtract(): boolean;

  /**
   * Extract content from the page.
   * Returns structured content with HTML, text, and metadata.
   */
  abstract extract(): ExtractorResult;

  /**
   * Get the site name for this extractor
   */
  abstract get siteName(): string;

  /**
   * Helper to safely query a selector
   */
  protected querySelector(selector: string): ExtractorElement | null {
    try {
      return this.document.querySelector(selector);
    } catch {
      return null;
    }
  }

  /**
   * Helper to safely query all matching elements
   */
  protected querySelectorAll(selector: string): ExtractorElement[] {
    try {
      return Array.from(this.document.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  /**
   * Helper to get text content from an element
   */
  protected getTextContent(element: ExtractorElement | null): string {
    if (!element) return "";
    return element.textContent?.trim() || "";
  }

  /**
   * Helper to get innerHTML from an element
   */
  protected getInnerHTML(element: ExtractorElement | null): string {
    if (!element) return "";
    return element.innerHTML?.trim() || "";
  }

  /**
   * Helper to get an attribute value
   */
  protected getAttribute(element: ExtractorElement | null, attr: string): string | null {
    if (!element) return null;
    return element.getAttribute?.(attr) || null;
  }

  /**
   * Helper to strip HTML and get plain text
   */
  protected stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Helper to format a date string
   */
  protected formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr.split("T")[0] || dateStr;
    }
  }
}
