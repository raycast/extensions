import { execSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QRProps } from "qrdx";
import { getFrameDimensions, toSVGString } from "qrdx";
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

// ─── Logos ────────────────────────────────────────────────────────────────────

// sips doesn't load images over the network: a logo given by its address is
// drawn as a broken-image cross. So a logo is fetched once and the code is
// drawn and exported with it as a data URL.

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TIMEOUT_MS = 10_000;
const logos = new Map<string, Promise<string>>();

function isRemote(src: string | undefined): src is string {
  return src !== undefined && /^https?:\/\//i.test(src);
}

async function fetchLogo(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
  } catch (error) {
    throw new Error(`Couldn't load the logo from ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    throw new Error(`Couldn't load the logo from ${url}: the server answered HTTP ${response.status}`);
  }
  const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!type.startsWith("image/")) {
    throw new Error(`Couldn't load the logo from ${url}: it isn't an image (${type || "no content type"})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error(`Couldn't load the logo from ${url}: it's larger than 5 MB`);
  }
  return `data:${type};base64,${bytes.toString("base64")}`;
}

/** The logo at `url` as a data URL; fetched once, and again after a failure. */
function loadLogo(url: string): Promise<string> {
  let pending = logos.get(url);
  if (!pending) {
    pending = fetchLogo(url);
    pending.catch(() => logos.delete(url));
    logos.set(url, pending);
  }
  return pending;
}

/**
 * `props` ready to draw: a logo given by its address is replaced with its
 * data URL. Throws, saying why, when the logo can't be loaded.
 */
export async function withLogoData(props: QRRenderProps): Promise<QRRenderProps> {
  const src = props.imageSettings?.src;
  if (!(props.imageSettings && isRemote(src))) return props;
  return { ...props, imageSettings: { ...props.imageSettings, src: await loadLogo(src) } };
}

/** `props` without a logo given by its address (one that couldn't be loaded). */
export function withoutRemoteLogo(props: QRRenderProps): QRRenderProps {
  if (!isRemote(props.imageSettings?.src)) return props;
  const { imageSettings: _remote, ...rest } = props;
  return rest;
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
  const background = fill ? `<rect fill="${fill}" height="${side}" width="${side}"/>` : "";
  return `<svg height="${pixels}" viewBox="0 0 ${side} ${side}" width="${pixels}" xmlns="http://www.w3.org/2000/svg">${background}<g transform="translate(${(side - width) / 2} ${(side - height) / 2})">${svg}</g></svg>`;
}

/**
 * The code's SVG markup, drawn by qrdx's string renderer (the same markup its
 * React component renders, without a DOM).
 */
export function buildSVGString(props: QRProps & { size?: number }): string {
  return toSVGString({ size: props.size ?? 512, ...props });
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

  writeFileSync(svgPath, `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`, "utf-8");

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
