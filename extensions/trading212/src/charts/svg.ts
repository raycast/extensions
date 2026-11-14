/** Content width of the List detail pane (≈430pt in the default Raycast window); wider images get clipped. */
export const DETAIL_CHART_WIDTH = 428;
export const SVG_SCALE = 2;

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function svgDocument(inner: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SVG_SCALE}" height="${height * SVG_SCALE}" viewBox="0 0 ${width} ${height}">${inner}</svg>`;
}

export function svgToMarkdown(svg: string, width: number, height: number, alt: string): string {
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return `![${alt}](data:image/svg+xml;base64,${b64}?raycast-width=${width}&raycast-height=${height})`;
}
