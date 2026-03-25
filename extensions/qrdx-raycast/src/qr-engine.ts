import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QRProps } from "qrdx";
import { QRCodeSVG } from "qrdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export function buildSVGString(props: QRProps & { size?: number }): string {
  const element = createElement(
    QRCodeSVG as React.ComponentType<QRProps & { size?: number }>,
    {
      size: props.size ?? 512,
      ...props,
    },
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
 * reliably inside Raycast's extension sandbox.
 */
export function buildPNGBuffer(props: QRProps & { size?: number }): Buffer {
  const svgString = buildSVGString(props);
  const size = props.size ?? 512;
  const id = `qrdx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const svgPath = join(tmpdir(), `${id}.svg`);
  const pngPath = join(tmpdir(), `${id}.png`);

  writeFileSync(
    svgPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`,
    "utf-8",
  );

  try {
    // sips is macOS-native (available since 10.3). Convert SVG → PNG at the
    // requested pixel dimensions. The --resampleHeightWidth flag resizes after
    // the initial rasterisation so the output is always exactly size×size.
    execSync(
      `sips -s format png "${svgPath}" --out "${pngPath}" --resampleHeightWidth ${size} ${size} 2>/dev/null`,
      { stdio: "pipe" },
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
