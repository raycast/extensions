import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { readFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import { Library, OpenSymbol } from "./data";
import { pathsToPdfOps, transformPaths } from "./geometry";
import { drawSymbol, FrameMode, Template, Weight } from "./render";

export type RenderOptions = {
  size: number;
  weight: Weight;
  /** Parsed color; `current` means SVG `currentColor` (PNG/PDF fall back to black). */
  color: Color;
  frame: FrameMode;
};

export type Color = { hex: string; rgb: [number, number, number]; current?: boolean };

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

/** Apple's system colors (light appearance), so names match SF Symbols Search. */
const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#8E8E93",
  grey: "#8E8E93",
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFCC00",
  green: "#34C759",
  mint: "#00C7BE",
  teal: "#30B0C7",
  cyan: "#32ADE6",
  blue: "#007AFF",
  indigo: "#5856D6",
  purple: "#AF52DE",
  pink: "#FF2D55",
  brown: "#A2845E",
};

export function parseColor(input: string | undefined): Color {
  const raw = (input ?? "").trim().toLowerCase();
  if (raw === "currentcolor") return { hex: "currentColor", rgb: [0, 0, 0], current: true };
  let hex = (NAMED[raw] ?? raw).toLowerCase();
  if (/^#?[0-9a-f]{3}$/.test(hex))
    hex = hex
      .replace("#", "")
      .split("")
      .map((c) => c + c)
      .join("");
  hex = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/.test(hex)) hex = "000000";
  const n = parseInt(hex, 16);
  return { hex: `#${hex.toUpperCase()}`, rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
}

/** Short, filename-safe label for a color ("" for the default black). */
export function colorLabel(input: string | undefined): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw || raw === "black" || raw === "#000" || raw === "#000000") return "";
  if (raw === "currentcolor") return "currentcolor";
  if (NAMED[raw]) return raw;
  return parseColor(raw).hex.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

const HOMEPAGES: Record<string, string> = {
  feather: "https://feathericons.com",
  "font-awesome": "https://fontawesome.com",
  heroicons: "https://heroicons.com",
  hugeicons: "https://hugeicons.com",
  iconoir: "https://iconoir.com",
  ionicons: "https://ionic.io/ionicons",
  lucide: "https://lucide.dev",
  "pictogrammers-material-design": "https://pictogrammers.com/library/mdi/",
  phosphor: "https://phosphoricons.com",
  tabler: "https://tabler.io/icons",
};

const LICENSE_URLS: Record<string, string> = {
  MIT: "https://opensource.org/license/mit",
  ISC: "https://opensource.org/license/isc-license-txt",
  "Apache 2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
};

export function libraryHomepage(library: Library) {
  return HOMEPAGES[library.id] ?? `https://opensymbols.dev/${library.id}`;
}

/**
 * A credit line suitable for an app's acknowledgements or a website footer.
 * For CC BY 4.0 (Font Awesome) it names the creator, license and that the icon
 * was modified, which is what that license asks for.
 */
export function attribution(symbol: OpenSymbol): string {
  const lib = symbol.library;
  const licenseUrl = LICENSE_URLS[lib.license];
  const license = licenseUrl ? `${lib.license} (${licenseUrl})` : lib.license;
  const owner = lib.id === "font-awesome" ? "Font Awesome Free by Fonticons, Inc." : lib.name;
  return `"${symbol.baseName}" icon from ${owner} (${libraryHomepage(lib)}), licensed under ${license}. Converted to SF Symbol format by Open Symbols (https://opensymbols.dev).`;
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/--/g, "- -");

export function buildSvg(symbol: OpenSymbol, template: Template, o: RenderOptions, comment = true): string {
  const { glyph, frame, k, width, height } = drawSymbol(template, o.weight, o.frame, o.size);
  const vbScale = 100 / Math.max(width, height); // viewBox normalized to 100 on the long side
  const vbW = Math.round(width * vbScale * 1000) / 1000;
  const vbH = Math.round(height * vbScale * 1000) / 1000;
  const paths = transformPaths(glyph.paths, frame, k * vbScale);
  const fill = o.color.current ? "currentColor" : o.color.hex;
  const w = Math.round(width * 100) / 100;
  const h = Math.round(height * 100) / 100;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}" fill="${fill}">`,
    comment ? `<!-- ${xmlEscape(attribution(symbol))} -->` : "",
    ...paths.map((d) => `<path d="${d}"/>`),
    `</svg>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// PDF (vector, written by hand: only m/l/c/h/f operators are needed)
// ---------------------------------------------------------------------------

const pdfString = (s: string) => `(${s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?")})`;

export function buildPdf(symbol: OpenSymbol, template: Template, o: RenderOptions): Buffer {
  const { glyph, frame, k, width, height } = drawSymbol(template, o.weight, o.frame, o.size);
  const [r, g, b] = o.color.current ? [0, 0, 0] : o.color.rgb.map((c) => Math.round((c / 255) * 1000) / 1000);
  const content = `${r} ${g} ${b} rg\n${pathsToPdfOps(glyph.paths, frame, k, height)}\n`;
  const w = Math.round(width * 1000) / 1000;
  const h = Math.round(height * 1000) / 1000;
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << >> >>`,
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
    `<< /Title ${pdfString(symbol.xcodeName)} /Author ${pdfString(symbol.library.name)} /Subject ${pdfString(attribution(symbol))} /Producer (Open Symbols Search for Raycast) >>`,
  ];
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// ---------------------------------------------------------------------------
// PNG (rasterised by resvg, compiled to WebAssembly so it needs no native code)
// ---------------------------------------------------------------------------

let wasmReady: Promise<void> | undefined;

function ensureWasm() {
  if (!wasmReady) {
    wasmReady = initWasm(readFileSync(join(environment.assetsPath, "resvg.wasm"))).catch((e: unknown) => {
      // A second init in the same process is harmless.
      if (!(e instanceof Error && /already initialized/i.test(e.message))) {
        wasmReady = undefined;
        throw e;
      }
    });
  }
  return wasmReady;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function textChunk(keyword: string, text: string): Buffer {
  const data = Buffer.from(`${keyword}\0${text.replace(/[^\x20-\x7e]/g, "?")}`, "latin1");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from("tEXt", "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/** Inserts tEXt chunks just before IEND. */
function withPngText(png: Buffer, entries: [string, string][]): Buffer {
  const iend = png.length - 12;
  return Buffer.concat([png.subarray(0, iend), ...entries.map(([k, v]) => textChunk(k, v)), png.subarray(iend)]);
}

export async function buildPng(symbol: OpenSymbol, template: Template, o: RenderOptions): Promise<Buffer> {
  await ensureWasm();
  const color = o.color.current ? { ...o.color, hex: "#000000", current: false } : o.color;
  const svg = buildSvg(symbol, template, { ...o, color }, false);
  const { width, height } = drawSymbol(template, o.weight, o.frame, o.size);
  const fitTo =
    width >= height
      ? { mode: "width" as const, value: Math.round(width) }
      : { mode: "height" as const, value: Math.round(height) };
  const resvg = new Resvg(svg, { fitTo, shapeRendering: 2 });
  try {
    const image = resvg.render();
    const png = Buffer.from(image.asPng());
    image.free();
    return withPngText(png, [
      ["Title", symbol.xcodeName],
      ["Copyright", attribution(symbol)],
      ["Software", "Open Symbols Search for Raycast"],
    ]);
  } finally {
    resvg.free();
  }
}
