import { Clipboard, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Text transformations to clean AI-generated artifacts
 */
const transformations: Array<{ pattern: RegExp; replacement: string }> = [
  // Hidden Characters - Zero-width spaces, format characters, BOM
  {
    pattern:
      /[\u00AD\u180E\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,
    replacement: "",
  },
  // Non-Breaking Spaces - Convert NBSP and narrow NBSP to regular spaces
  { pattern: /[\u00A0\u202F]/g, replacement: " " },
  // Dashes - Convert em-dash, en-dash, horizontal bar to hyphen
  { pattern: /[\u2013\u2014\u2015]/g, replacement: "-" },
  // Double Quotes - Convert curly quotes and guillemets to straight quotes
  {
    pattern: /[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u301D\u301E]/g,
    replacement: '"',
  },
  // Single Quotes - Convert curly apostrophes to straight quotes
  { pattern: /[\u2018\u2019]/g, replacement: "'" },
  // Ellipsis - Convert ellipsis character to three periods
  { pattern: /\u2026/g, replacement: "..." },
  // Numbered Lists - Convert tab-indented numbered lists to clean format
  { pattern: /\t(\d+)\.\t/g, replacement: "$1. " },
  // Bullet Lists - Convert tab-indented bullets to clean format
  { pattern: /\t•\t/g, replacement: "• " },
  // Markdown Headings - Remove # heading markers from line starts
  { pattern: /^#{1,6}\s*/gm, replacement: "" },
  // Trailing Whitespace - Remove spaces/tabs at end of lines
  { pattern: /\s+$/gm, replacement: "" },
];

/**
 * Clean AI-generated text by applying all transformations
 */
function cleanAIText(text: string): string {
  let result = text;
  for (const { pattern, replacement } of transformations) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Convert cleaned markdown-style text to HTML for RTF rendering
 */
function markdownToHtml(text: string): string {
  const lines = text.split("\n");
  let html = "";
  let inOl = false;
  let inUl = false;

  for (const line of lines) {
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    const ulMatch = line.match(/^[*\-•]\s+(.*)$/);
    const indentedUlMatch = line.match(/^(\s+)[*\-•]\s+(.*)$/);

    if (olMatch) {
      if (inUl) {
        html += "</ul>";
        inUl = false;
      }
      if (!inOl) {
        html += "<ol>";
        inOl = true;
      }
      html += `<li>${olMatch[2]}</li>`;
    } else if (ulMatch) {
      if (inOl) {
        html += "</ol>";
        inOl = false;
      }
      if (!inUl) {
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${ulMatch[1]}</li>`;
    } else if (indentedUlMatch) {
      if (!inUl) {
        html += "<ul>";
        inUl = true;
      }
      html += `<li>${indentedUlMatch[2]}</li>`;
    } else {
      if (inOl) {
        html += "</ol>";
        inOl = false;
      }
      if (inUl) {
        html += "</ul>";
        inUl = false;
      }
      if (line.trim()) {
        html += `<p>${line}</p>`;
      }
    }
  }

  if (inOl) html += "</ol>";
  if (inUl) html += "</ul>";

  return `<!DOCTYPE html><html><body>${html}</body></html>`;
}

export default async function Command() {
  try {
    // Get text from clipboard
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("Clipboard is empty");
      return;
    }

    // Clean the text
    const cleaned = cleanAIText(clipboardText);

    // Convert to HTML for proper list rendering
    const html = markdownToHtml(cleaned);

    // Write HTML and convert to RTF using textutil
    const tmpHtml = join(tmpdir(), "raycast-clean-ai-text.html");
    const tmpRtf = join(tmpdir(), "raycast-clean-ai-text.rtf");
    const tmpTxt = join(tmpdir(), "raycast-clean-ai-text.txt");

    writeFileSync(tmpHtml, html);
    writeFileSync(tmpTxt, cleaned);
    execSync(`textutil -convert rtf -output "${tmpRtf}" "${tmpHtml}"`);

    // Put RTF and plain text on clipboard using osascript
    execSync(`osascript -l JavaScript -e '
      ObjC.import("AppKit");
      ObjC.import("Foundation");
      var rtfData = $.NSData.dataWithContentsOfFile("${tmpRtf}");
      var plainData = $.NSString.stringWithContentsOfFileEncodingError("${tmpTxt}", $.NSUTF8StringEncoding, null);
      var pb = $.NSPasteboard.generalPasteboard;
      pb.clearContents;
      pb.setDataForType(rtfData, $.NSPasteboardTypeRTF);
      pb.setStringForType(plainData, $.NSPasteboardTypeString);
    '`);

    // Cleanup temp files
    if (existsSync(tmpHtml)) unlinkSync(tmpHtml);
    if (existsSync(tmpRtf)) unlinkSync(tmpRtf);
    if (existsSync(tmpTxt)) unlinkSync(tmpTxt);

    await showHUD("Clipboard cleaned ✓");
  } catch (error) {
    await showHUD("Failed to clean clipboard");
    console.error(error);
  }
}
