import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QRProps } from "qrdx";
import { getFrameDimensions, QRCodeSVG } from "qrdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildFrame } from "./frames";
import type { Settings } from "./types";

export type QRRenderProps = QRProps & { size: number };

/** The props qrdx draws a code with from the extension's settings. */
export function buildQRProps(url: string, s: Settings): QRRenderProps {
  const size = Math.max(64, Number.parseInt(s.size || "512", 10) || 512);
  const margin = Number.parseInt(s.margin || "0", 10) || 0;
  const props: QRRenderProps = {
    value: url.trim() || "https://qrdx.dev",
    size,
    margin,
    level: s.level || "Q",
    bodyPattern: s.bodyPattern,
    cornerEyePattern: s.cornerEyePattern,
    cornerEyeDotPattern: s.cornerEyeDotPattern,
    fgColor: s.fgColor?.trim() || "#000000",
    bgColor: s.bgColor?.trim() || "#ffffff",
  };
  if (s.eyeColor?.trim()) props.eyeColor = s.eyeColor.trim();
  if (s.dotColor?.trim()) props.dotColor = s.dotColor.trim();
  const frame = buildFrame(s);
  if (frame) {
    props.frame = frame;
  } else if (s.templateId?.trim()) {
    // A code saved with a template before frames replaced them.
    props.templateId = s.templateId.trim();
  }
  if (s.logo?.trim()) {
    props.imageSettings = {
      src: s.logo.trim(),
      height: Math.round(size * 0.2),
      width: Math.round(size * 0.2),
      excavate: true,
    };
  }
  return props;
}

/**
 * The artwork's size: the code's `size`, plus the space a frame adds around
 * it (a template draws inside the code's size).
 */
export function artworkSize(props: QRRenderProps): {
  width: number;
  height: number;
} {
  return getFrameDimensions(props.size, props.frame);
}

/**
 * `svg`, an artwork `width` × `height`, centered on a square `pixels` wide,
 * so a framed code keeps its proportions in square tiles and icons. The
 * square is `fill` (transparent without it).
 */
export function squareSVG(
  svg: string,
  { width, height }: { width: number; height: number },
  pixels: number,
  fill?: string
): string {
  const side = Math.max(width, height);
  const background = fill
    ? `<rect fill="${fill}" height="${side}" width="${side}"/>`
    : "";
  return `<svg height="${pixels}" viewBox="0 0 ${side} ${side}" width="${pixels}" xmlns="http://www.w3.org/2000/svg">${background}<g transform="translate(${(side - width) / 2} ${(side - height) / 2})">${svg}</g></svg>`;
}

export function buildSVGString(props: QRProps & { size?: number }): string {
  const element = createElement(
    QRCodeSVG as React.ComponentType<QRProps & { size?: number }>,
    {
      size: props.size ?? 512,
      ...props,
    }
  );
  return renderToStaticMarkup(element);
}

export function getSVGDataURI(props: QRProps & { size?: number }): string {
  const svg = buildSVGString(props);
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Converts the QR SVG to a PNG buffer using macOS's built-in `sips` utility.
 * This avoids any native Node addon dependency (sharp, canvas, etc.) and works
 * reliably inside Raycast's extension sandbox. The PNG is the code's size
 * plus any frame, as qrdx's CLI makes it.
 */
export function buildPNGBuffer(props: QRRenderProps): Buffer {
  const svgString = buildSVGString(props);
  const artwork = artworkSize(props);
  const width = Math.round(artwork.width);
  const height = Math.round(artwork.height);
  const id = `qrdx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const svgPath = join(tmpdir(), `${id}.svg`);
  const pngPath = join(tmpdir(), `${id}.png`);

  writeFileSync(
    svgPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`,
    "utf-8"
  );

  try {
    // sips is macOS-native (available since 10.3). Convert SVG → PNG at the
    // requested pixel dimensions. The --resampleHeightWidth flag (height
    // first) resizes after the initial rasterisation so the output is always
    // exactly width × height.
    execSync(
      `sips -s format png "${svgPath}" --out "${pngPath}" --resampleHeightWidth ${height} ${width} 2>/dev/null`,
      { stdio: "pipe" }
    );
    return readFileSync(pngPath);
  } finally {
    try {
      unlinkSync(svgPath);
    } catch {
      /* ignore cleanup errors */
    }
    try {
      unlinkSync(pngPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}
