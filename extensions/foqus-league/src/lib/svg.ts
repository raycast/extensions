export const CHART_WIDTH = 700;

export const px = (n: number) => Math.round(n * 100) / 100;

export function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function textWidth(s: string, size: number, weight = 400): number {
  const base = weight >= 600 ? 0.58 : 0.545;
  let w = 0;
  for (const ch of s) {
    if (/[ilj.,'!|:;]/.test(ch)) w += size * 0.28;
    else if (/[A-Z0-9]/.test(ch)) w += size * (base + 0.04);
    else if (/[mwMW]/.test(ch)) w += size * (base + 0.22);
    else w += size * base;
  }
  return w;
}

export function truncateToWidth(
  content: string,
  { maxWidth, fontSize, weight = 400 }: { maxWidth: number; fontSize: number; weight?: number },
): string {
  if (textWidth(content, fontSize, weight) <= maxWidth) return content;
  let out = content;
  while (out.length > 1 && textWidth(`${out}…`, fontSize, weight) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

export type TextOpts = {
  size?: number;
  weight?: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  spacing?: number;
};

export function text(x: number, y: number, content: string, o: TextOpts): string {
  const attrs = [
    `x="${px(x)}"`,
    `y="${px(y)}"`,
    `font-size="${o.size ?? 13}"`,
    `font-weight="${o.weight ?? 400}"`,
    `fill="${o.fill}"`,
  ];
  if (o.anchor) attrs.push(`text-anchor="${o.anchor}"`);
  if (o.spacing) attrs.push(`letter-spacing="${o.spacing}"`);
  return `<text ${attrs.join(" ")}>${escapeXml(content)}</text>`;
}

type RectOpts = { rx?: number; fill?: string; opacity?: number; stroke?: string };

export function rect(x: number, y: number, w: number, h: number, o: RectOpts = {}): string {
  const attrs = [`x="${px(x)}"`, `y="${px(y)}"`, `width="${px(Math.max(0, w))}"`, `height="${px(Math.max(0, h))}"`];
  if (o.rx != null) attrs.push(`rx="${o.rx}"`);
  attrs.push(`fill="${o.fill ?? "none"}"`);
  if (o.stroke) attrs.push(`stroke="${o.stroke}"`, `stroke-width="1"`);
  if (o.opacity != null) attrs.push(`opacity="${o.opacity}"`);
  return `<rect ${attrs.join(" ")} />`;
}

export function svg(width: number, height: number, font: string, body: string, defs = ""): string {
  const h = Math.ceil(height);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" font-family="${font}">`,
    defs ? `<defs>${defs}</defs>` : "",
    body,
    "</svg>",
  ].join("\n");
}

export function luminance(hex: string): number {
  const c = (i: number) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
}

export function toDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svgMarkup, "utf8").toString("base64")}`;
}

export function markdownImage(alt: string, svgMarkup: string, width: number = CHART_WIDTH): string {
  return `![${alt}](${toDataUri(svgMarkup)}?raycast-width=${width})`;
}
