import { Clipboard } from "@raycast/api";
import { ClipboardAdapter } from "../core/adapters/index.js";
import { mdlog } from "../core/logging.js";
import { debugConfig } from "../core/env.js";

const debugLog = (...args: unknown[]) => {
  if (debugConfig.clipboardDebug) {
    console.log(...args);
  }
};

export class RaycastClipboardAdapter implements ClipboardAdapter {
  /**
   * Read the rich-text (HTML) flavor of the clipboard.
   *
   * Uses the first-class `Clipboard.read()` API, which exposes the HTML
   * representation of the clipboard (the `public.html` pasteboard flavor on
   * macOS) when one is present. This is the supported, cross-platform way to
   * read clipboard HTML and works inside the Raycast extension runtime.
   *
   * Earlier versions shelled out to `pbpaste -Prefer public.html` via
   * `child_process`. That hack was macOS-only and stopped working in the
   * Raycast 2 worker-thread runtime, which is why the extension appeared to do
   * nothing. See https://github.com/raycast/extensions/issues/28973.
   */
  async readHtml(): Promise<string | null> {
    try {
      debugLog("Reading HTML flavor via Clipboard.read()...");

      const { html } = await Clipboard.read();

      if (typeof html === "string" && html.trim()) {
        // Only treat it as rich text if it actually contains markup, so a
        // plain-text clipboard isn't mistaken for HTML.
        if (html.includes("<") && html.includes(">")) {
          debugLog(`Found HTML content (${html.length} chars):`, html.substring(0, 200) + "...");
          return html;
        }
      }

      debugLog("No HTML content found in clipboard");
      return null;
    } catch (error) {
      mdlog("warn", "clipboard", "Failed to read HTML from clipboard", error);
      return null;
    }
  }

  async readText(): Promise<string | null> {
    try {
      const content = await Clipboard.readText();
      // Ensure we return a string or null
      if (typeof content === "string") {
        return content;
      }
      return null;
    } catch (error) {
      mdlog("warn", "clipboard", "Failed to read text from clipboard", error);
      return null;
    }
  }

  async writeText(text: string): Promise<void> {
    try {
      await Clipboard.copy(text);
    } catch (error) {
      mdlog("error", "clipboard", "Failed to write text to clipboard", error);
      throw error;
    }
  }
}
