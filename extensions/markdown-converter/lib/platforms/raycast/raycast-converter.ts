import { convertClipboardPayload as coreConvertClipboardPayload, ConversionOptions } from "../../core/converter.js";
import { RaycastClipboardAdapter, RaycastDOMParserAdapter } from "./adapters/index.js";

// Create adapter instances for reuse
const raycastClipboard = new RaycastClipboardAdapter();
const raycastDOMParser = new RaycastDOMParserAdapter();

/**
 * Read from Raycast clipboard and convert to Markdown.
 */
async function convertFromClipboard(options: ConversionOptions = {}): Promise<string> {
  const html = await raycastClipboard.readHtml();
  const text = await raycastClipboard.readText();
  
  return coreConvertClipboardPayload(html || undefined, text || undefined, {
    ...options,
    domParserAdapter: raycastDOMParser
  });
}

// Create a backward-compatible object with the method signature
export const raycastConverter = {
  convertFromClipboard
};