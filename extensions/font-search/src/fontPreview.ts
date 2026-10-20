import { Color } from "@raycast/api";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createFontPreviewSVG(fontName: string, text: string): string {
  // Both values end up inside the SVG markup, so they have to be escaped: an
  // ampersand in the preview text preference (or in a font name) would otherwise
  // produce invalid XML and the preview would not render at all.
  const family = escapeXml(fontName);
  const previewText = escapeXml(text);

  // The fill below is only a placeholder: `raycast-tint-color` recolors every
  // non-transparent pixel of a markdown image, so the preview picks up Raycast's
  // primary text color and follows the active theme. The token cannot be used as
  // the SVG `fill` directly, because Raycast does not resolve `raycast-*` colors
  // inside an embedded data URI.
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">
      <style>
        text {
          font-size: 24px;
          fill: #000000;
          filter: saturate(0);
        }
      </style>
      <text font-family="${family}" x="10" y="70">${previewText}</text>
      <text font-family="${family}" x="10" y="120">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text>
      <text font-family="${family}" x="10" y="170">abcdefghijklmnopqrstuvwxyz</text>
      <text font-family="${family}" x="10" y="220">0123456789!@#$%^()_+-={}[]:;</text>
    </svg>
  `;

  const uri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;
  return `![Font preview](${uri}?raycast-tint-color=${Color.PrimaryText})`;
}
