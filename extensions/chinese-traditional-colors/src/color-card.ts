import type { ColorReference, TraditionalColor } from "./types";

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function contrastTextColor(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.62 ? "#1F1F1F" : "#FFFFFF";
}

function paletteReferences(color: TraditionalColor): ColorReference[] {
  return [color.main, ...color.secondary, ...color.accent].filter(
    (reference, index, references) => references.findIndex((item) => item.hex === reference.hex) === index,
  );
}

export function colorSwatchSvg(color: TraditionalColor): string {
  const name = escapeXml(color.name);
  const pinyin = escapeXml(color.pinyin);
  const textColor = contrastTextColor(color.hex);

  return encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360">
  <rect width="1200" height="360" rx="36" fill="${color.hex}"/>
  <text x="64" y="132" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="72" font-weight="760" fill="${textColor}">${color.number} ${name}</text>
  <text x="64" y="218" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="42" font-weight="560" fill="${textColor}" opacity="0.82">${pinyin}</text>
  <text x="64" y="300" font-family="SF Mono,Menlo,monospace" font-size="56" font-weight="700" fill="${textColor}" opacity="0.9">${color.hex}</text>
</svg>`);
}

export function paletteReferencesCardSvg(title: string, references: ColorReference[]): string {
  const width = 1200;
  const height = 760;
  const bandWidth = width / Math.max(references.length, 1);
  const bands = references
    .map(
      (reference, index) =>
        `<rect x="${index * bandWidth}" y="0" width="${bandWidth + 1}" height="760" fill="${reference.hex}"/>`,
    )
    .join("");

  return encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bands}
  <rect x="0" y="520" width="${width}" height="240" fill="rgba(0,0,0,0.34)"/>
  <text x="56" y="612" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="58" font-weight="760" fill="#fff">${escapeXml(title)}</text>
  <text x="56" y="686" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" font-size="34" font-weight="560" fill="rgba(255,255,255,0.88)">${escapeXml(
    references.map((reference) => reference.hex).join("  "),
  )}</text>
</svg>`);
}

export function paletteSchemeReferences(color: TraditionalColor): ColorReference[] {
  return paletteReferences(color);
}
