import { convertClipboardPayload as coreConvertClipboardPayload, ConversionOptions } from "./core/converter.js";
import { RaycastClipboardAdapter, RaycastDOMParserAdapter } from "./adapters/index.js";
import { detectInputFormat, type DetectedFormat } from "./core/format-detection.js";

// Create adapter instances for reuse
const raycastClipboard = new RaycastClipboardAdapter();
const raycastDOMParser = new RaycastDOMParserAdapter();

/**
 * Structured clipboard content with source detection.
 * Used by "to X" commands to decide conversion path and HUD message.
 */
export interface ClipboardContent {
  /** The text to convert (may be round-tripped from rich text → Markdown) */
  text: string;
  /** True if the clipboard contained rich text HTML that was converted to Markdown */
  sourceWasRichText: boolean;
  /** Detected format of the text content */
  detectedFormat: DetectedFormat;
}

/**
 * Read from Raycast clipboard and convert to Markdown.
 */
async function convertFromClipboard(options: ConversionOptions = {}): Promise<string> {
  const html = await raycastClipboard.readHtml();
  const text = await raycastClipboard.readText();

  return coreConvertClipboardPayload(html || undefined, text || undefined, {
    ...options,
    domParserAdapter: raycastDOMParser,
  });
}

/**
 * Get clipboard content with smart detection for "to X" commands.
 *
 * If the clipboard has rich text (HTML), round-trips it through Markdown
 * so the "to X" conversion produces a useful result instead of silently
 * degrading. Returns structured info so commands can show descriptive HUD.
 */
async function getClipboardContent(): Promise<ClipboardContent | null> {
  const html = await raycastClipboard.readHtml();
  const text = await raycastClipboard.readText();

  // If HTML is on the clipboard, round-trip: HTML → Markdown
  if (html && typeof html === "string" && html.trim()) {
    const markdown = coreConvertClipboardPayload(html, text || undefined, {
      domParserAdapter: raycastDOMParser,
    });
    if (markdown.trim()) {
      return {
        text: markdown,
        sourceWasRichText: true,
        detectedFormat: "markdown",
      };
    }
  }

  // No rich text — use plain text and detect its format
  if (text && typeof text === "string" && text.trim()) {
    return {
      text,
      sourceWasRichText: false,
      detectedFormat: detectInputFormat(text),
    };
  }

  return null;
}

export const raycastConverter = {
  convertFromClipboard,
  getClipboardContent,
};
