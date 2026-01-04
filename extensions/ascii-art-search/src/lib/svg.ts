/**
 * SVG generation utilities for grid thumbnails
 */
import { SVG_CONFIG } from "../constants";

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Calculate visual width considering full-width characters
 * Full-width characters (CJK, etc.) count as 2, half-width as 1
 */
function getVisualWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Full-width: CJK, Korean, full-width forms, etc.
    if (
      code >= 0x1100 &&
      (code <= 0x115f ||
        code === 0x2329 ||
        code === 0x232a ||
        (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe10 && code <= 0xfe1f) ||
        (code >= 0xfe30 && code <= 0xfe6f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6) ||
        (code >= 0x20000 && code <= 0x2fffd) ||
        (code >= 0x30000 && code <= 0x3fffd))
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Generate SVG data URI for kaomoji/ASCII art display
 */
export function generateSvgDataUri(text: string): string {
  const { fontSize: baseFontSize, lineHeight, padding, textColor, charWidthHalf, outputSize, fontFamily } = SVG_CONFIG;

  const lines = text.split("\n");
  const maxLineWidth = Math.max(...lines.map((line) => getVisualWidth(line)));
  const isSingleLine = lines.length === 1;

  // Always use fixed viewBox for consistent rendering
  const viewBoxSize = outputSize;
  const availableSize = viewBoxSize - padding * 2;

  // Calculate font size to fit content
  let fontSize: number;
  if (isSingleLine) {
    // For single line: scale font based on text length (use actual character count, not visual width)
    const charCount = [...text].length;
    const maxFontByWidth = availableSize / (charCount * 0.55);
    fontSize = Math.min(Math.max(maxFontByWidth, 16), 36);
  } else {
    // For multi-line: scale to fit both width and height
    const lineHeightPx = baseFontSize * lineHeight;
    const estContentHeight = lines.length * lineHeightPx;
    const estContentWidth = maxLineWidth * charWidthHalf;
    const scaleX = availableSize / estContentWidth;
    const scaleY = availableSize / estContentHeight;
    const scale = Math.min(scaleX, scaleY, 1.5);
    fontSize = baseFontSize * scale;
  }

  const lineHeightPx = fontSize * lineHeight;

  let textElements: string;
  if (isSingleLine) {
    // Single line: center both horizontally and vertically
    const centerY = viewBoxSize / 2 + fontSize * 0.35;
    textElements = `<text x="${viewBoxSize / 2}" y="${centerY}" text-anchor="middle" fill="${textColor}">${escapeXml(text)}</text>`;
  } else {
    // Multi-line: center the block as a whole, preserving leading whitespace
    const totalHeight = lines.length * lineHeightPx;
    const startY = (viewBoxSize - totalHeight) / 2 + fontSize * 0.85;
    // Calculate block width and center offset
    const blockWidth = maxLineWidth * charWidthHalf * (fontSize / baseFontSize);
    const startX = (viewBoxSize - blockWidth) / 2;
    textElements = lines
      .map((line, index) => {
        const y = startY + index * lineHeightPx;
        // Use text-anchor="start" to preserve leading whitespace
        return `<text x="${startX}" y="${y}" text-anchor="start" fill="${textColor}">${escapeXml(line)}</text>`;
      })
      .join("");
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputSize}" height="${outputSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}"><style>text{font-family:${fontFamily};font-size:${fontSize}px}</style><g>${textElements}</g></svg>`;

  // Use base64 encoding for better Unicode support
  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate SVG data URI for large ASCII art preview (auto-scaling)
 */
export function generatePreviewSvgDataUri(text: string): string {
  const lines = text.split("\n");
  const maxLineWidth = Math.max(...lines.map((line) => getVisualWidth(line)));
  const lineCount = lines.length;

  // Base font size and calculate dimensions
  const baseFontSize = 14;
  const charWidth = 8.4;
  const lineHeightRatio = 1.2;
  const padding = 20;

  // Calculate content dimensions
  const contentWidth = maxLineWidth * charWidth;
  const contentHeight = lineCount * baseFontSize * lineHeightRatio;

  // Output size (Raycast detail panel is roughly 400-500px wide)
  const outputWidth = 500;
  const outputHeight = 400;

  // Calculate scale to fit content in output, with padding
  const availableWidth = outputWidth - padding * 2;
  const availableHeight = outputHeight - padding * 2;
  const scaleX = contentWidth > 0 ? availableWidth / contentWidth : 1;
  const scaleY = contentHeight > 0 ? availableHeight / contentHeight : 1;
  const scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x to avoid too large text

  const scaledFontSize = baseFontSize * scale;
  const scaledLineHeight = scaledFontSize * lineHeightRatio;
  const scaledContentWidth = contentWidth * scale;
  const scaledContentHeight = contentHeight * scale;

  // Center the block as a whole, preserving leading whitespace
  const offsetX = (outputWidth - scaledContentWidth) / 2;
  const offsetY = (outputHeight - scaledContentHeight) / 2 + scaledFontSize * 0.8;

  const textElements = lines
    .map((line, index) => {
      const y = offsetY + index * scaledLineHeight;
      // Use text-anchor="start" to preserve leading whitespace
      return `<text x="${offsetX}" y="${y}" text-anchor="start" fill="#ffffff">${escapeXml(line)}</text>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}"><rect width="100%" height="100%" fill="#1a1a1a"/><style>text{font-family:Menlo,Monaco,Consolas,monospace;font-size:${scaledFontSize}px;white-space:pre}</style><g>${textElements}</g></svg>`;

  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get Unicode code points string for display
 */
export function getUnicodeCodePoints(text: string): string {
  const codePoints: string[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined) {
      const hex = codePoint.toString(16).toUpperCase();
      const padded = hex.padStart(4, "0");
      codePoints.push(`U+${padded}`);
    }
  }
  return codePoints.join(" ");
}
