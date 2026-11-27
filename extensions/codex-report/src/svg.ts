import type { SvgImage } from "./png";

export const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function imageMarkdown(title: string, image: SvgImage, displayWidth = image.width): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}" viewBox="0 0 ${image.width} ${image.height}">${image.body}</svg>`;
  return `![${title}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${displayWidth})`;
}
