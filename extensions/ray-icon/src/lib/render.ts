import { environment, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { ICONS } from "./icons";
import { IconSettings } from "./settings";

const SIZE = 512;

type Glyph = { viewBox: string; body: string };

/** Pulls the viewBox and inner markup out of a pasted SVG so it can be nested like a built-in icon. */
export function parseCustomSvg(source: string): Glyph | undefined {
  const match = source.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!match) return undefined;
  const [, attributes, body] = match;
  const viewBox = attributes.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (viewBox) return { viewBox, body };
  const width = parseFloat(attributes.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1] ?? "24");
  const height = parseFloat(attributes.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1] ?? "24");
  return { viewBox: `0 0 ${width} ${height}`, body };
}

function glyphFor(settings: IconSettings): Glyph | undefined {
  if (settings.customSvg) return parseCustomSvg(settings.customSvg);
  return settings.icon ? ICONS[settings.icon] : undefined;
}

let noiseDataUri: string | undefined;
function noise(): string {
  noiseDataUri ??= `data:image/png;base64,${readFileSync(join(environment.assetsPath, "noise.png")).toString("base64")}`;
  return noiseDataUri;
}

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Same SVG ray.so/icon builds in ResultIcon.tsx; `preview` skips the stroke and noise like the web preview does. */
export function renderSvg(settings: IconSettings, { preview = false } = {}): string {
  const stroke = preview ? 0 : num(settings.backgroundStrokeSize);
  const inner = SIZE - stroke;
  const offset = stroke / 2;
  const radius = num(settings.backgroundRadius, 128);
  const [fx, fy] = (settings.backgroundPosition || "50%,0%").split(",");
  const fill = settings.backgroundFillType === "Solid" ? settings.backgroundStartColor : "url(#bg)";

  const gradient =
    settings.backgroundFillType === "Radial"
      ? `<radialGradient id="bg" cx="50%" cy="50%" r="100%" fx="${fx}" fy="${fy}" gradientUnits="objectBoundingBox">
      <stop stop-color="${settings.backgroundStartColor}"/>
      <stop offset="${num(settings.backgroundSpread, 100) / 100}" stop-color="${settings.backgroundEndColor}"/>
    </radialGradient>`
      : `<linearGradient id="bg" x1="0" y1="0" x2="${SIZE}" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(${num(settings.backgroundAngle)} ${SIZE / 2} ${SIZE / 2})">
      <stop stop-color="${settings.backgroundStartColor}"/>
      <stop offset="1" stop-color="${settings.backgroundEndColor}"/>
    </linearGradient>`;

  const glyph = glyphFor(settings);
  const iconSize = num(settings.iconSize, 352);
  const iconMarkup = glyph
    ? `<svg x="${(SIZE - iconSize) / 2 + num(settings.iconOffsetX)}" y="${(SIZE - iconSize) / 2 + num(settings.iconOffsetY)}" width="${iconSize}" height="${iconSize}" viewBox="${glyph.viewBox}" fill="none" color="${settings.iconColor}" style="color:${settings.iconColor}">${glyph.body}</svg>`
    : "";

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${gradient}
    <radialGradient id="glare" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${SIZE / 2}) rotate(90) scale(${SIZE})">
      <stop stop-color="white"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip"><rect width="${inner}" height="${inner}" x="${offset}" y="${offset}" rx="${radius}"/></clipPath>
  </defs>
  <rect width="${inner}" height="${inner}" x="${offset}" y="${offset}" rx="${radius}" fill="${fill}" stroke="${settings.backgroundStrokeColor}" stroke-width="${stroke}" stroke-opacity="${num(settings.backgroundStrokeOpacity, 100) / 100}" paint-order="stroke"/>
  ${settings.backgroundRadialGlare ? `<rect width="${inner}" height="${inner}" x="${offset}" y="${offset}" rx="${radius}" fill="url(#glare)" style="mix-blend-mode:overlay"/>` : ""}
  ${settings.backgroundNoiseTexture && !preview ? `<image href="${noise()}" width="${inner}" height="${inner}" x="${offset}" y="${offset}" clip-path="url(#clip)" opacity="${num(settings.backgroundNoiseTextureOpacity, 25) / 100}" preserveAspectRatio="none"/>` : ""}
  ${iconMarkup}
</svg>`;
}

let wasmReady: Promise<void> | undefined;
function ensureWasm() {
  wasmReady ??= initWasm(readFileSync(join(environment.assetsPath, "resvg.wasm")));
  return wasmReady;
}

export async function renderPng(settings: IconSettings, size = SIZE): Promise<Buffer> {
  await ensureWasm();
  const resvg = new Resvg(renderSvg(settings), { fitTo: { mode: "width", value: size } });
  try {
    const rendered = resvg.render();
    try {
      return Buffer.from(rendered.asPng());
    } finally {
      rendered.free();
    }
  } finally {
    resvg.free();
  }
}

/** Full-fidelity preview, including border and texture, cached by rendered content. */
export async function previewPng(settings: IconSettings): Promise<string> {
  const svg = renderSvg(settings);
  const dir = join(environment.supportPath, "previews");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${createHash("sha256").update(svg).digest("hex")}.png`);
  if (!existsSync(path)) writeFileSync(path, await renderPng(settings, 320));
  return path;
}

/** Writes a preview SVG to the support folder and returns its path; Grid and Detail render SVG files natively. */
export function previewFile(settings: IconSettings): string {
  const svg = renderSvg(settings, { preview: true });
  const dir = join(environment.supportPath, "previews");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${createHash("sha1").update(svg).digest("hex").slice(0, 16)}.svg`);
  if (!existsSync(path)) writeFileSync(path, svg);
  return path;
}

export function exportDirectory(): string {
  const { exportDirectory } = getPreferenceValues<{ exportDirectory?: string }>();
  const dir = exportDirectory || join(homedir(), "Downloads");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFileName(name: string): string {
  return (name || "extension_icon").replace(/[^\w.-]+/g, "_").replace(/\.(png|svg)$/i, "");
}

/** Picks name.ext, then name-2.ext, … so exports never overwrite each other. */
function uniquePath(dir: string, base: string, ext: string): string {
  let path = join(dir, `${base}.${ext}`);
  for (let i = 2; existsSync(path); i++) path = join(dir, `${base}-${i}.${ext}`);
  return path;
}

export async function exportPng(settings: IconSettings, size = SIZE): Promise<string> {
  const suffix = size === SIZE ? "" : `@${size}`;
  const path = uniquePath(exportDirectory(), `${safeFileName(settings.fileName)}${suffix}`, "png");
  writeFileSync(path, await renderPng(settings, size));
  return path;
}

export function exportSvg(settings: IconSettings): string {
  const path = uniquePath(exportDirectory(), safeFileName(settings.fileName), "svg");
  writeFileSync(path, renderSvg(settings));
  return path;
}

/** Renders a PNG into the support folder (for clipboard copies) and returns the path. */
export async function tempPng(settings: IconSettings): Promise<string> {
  const dir = join(environment.supportPath, "clipboard");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${safeFileName(settings.fileName)}.png`);
  writeFileSync(path, await renderPng(settings));
  return path;
}
