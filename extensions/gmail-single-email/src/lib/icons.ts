import { Image } from "@raycast/api";

// Function to escape characters that have special meaning in XML/HTML
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'\"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function getSVGText(text: string): string | undefined {
  if (!text || text.length <= 0) {
    return undefined;
  }
  // Sanitize the input text before injecting into SVG
  const sanitizedText = escapeXml(text);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <rect x="0" y="0" width="40" height="40" fill="#FA6E34" rx="10"></rect>
    <text
    font-size="22"
    fill="white"
    font-family="Verdana"
    text-anchor="middle"
    alignment-baseline="baseline"
    x="20.5"
    y="32.5">${sanitizedText}</text>
  </svg>
    `.replaceAll("\n", "");

  return `data:image/svg+xml,${svg}`;
}

export function getTextIcon(text: string): Image.ImageLike | undefined {
  if (!text || text.length <= 0) {
    return undefined;
  }
  return getSVGText(text);
}
