// Raycast renders SVG data URIs in detail markdown, so charts need no image files.
export function chartMarkdown(svg: string): string {
  return `![Power chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}
