import { environment } from "@raycast/api";
import { existsSync } from "fs";
import { copyFile, mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { getCatalog, OpenSymbol } from "./data";
import { bbox, squareFrame, transformPaths } from "./geometry";

/**
 * Open Symbols ships SF Symbol templates (one SVG per symbol holding
 * Ultralight, Regular and Black masters). We fetch a template once, cache it,
 * and render small preview SVGs from it. Because the three masters are
 * point-compatible, intermediate weights are produced by interpolating
 * between them, the way SF Symbols does.
 */

export const WEIGHTS = [
  "ultralight",
  "thin",
  "light",
  "regular",
  "medium",
  "semibold",
  "bold",
  "heavy",
  "black",
] as const;
export type Weight = (typeof WEIGHTS)[number];

export const WEIGHT_TITLES: Record<Weight, string> = {
  ultralight: "Ultralight",
  thin: "Thin",
  light: "Light",
  regular: "Regular",
  medium: "Medium",
  semibold: "Semibold",
  bold: "Bold",
  heavy: "Heavy",
  black: "Black",
};

type Master = "Ultralight" | "Regular" | "Black";

/** [from, to, t]. Evenly spaced between masters — close to, not exactly, Apple's curve. */
const WEIGHT_MIX: Record<Weight, [Master, Master, number]> = {
  ultralight: ["Ultralight", "Regular", 0],
  thin: ["Ultralight", "Regular", 1 / 3],
  light: ["Ultralight", "Regular", 2 / 3],
  regular: ["Regular", "Regular", 0],
  medium: ["Regular", "Black", 1 / 5],
  semibold: ["Regular", "Black", 2 / 5],
  bold: ["Regular", "Black", 3 / 5],
  heavy: ["Regular", "Black", 4 / 5],
  black: ["Regular", "Black", 1],
};

type Glyph = { paths: string[]; width: number };
export type Template = { masters: Record<Master, Glyph>; capHeight: number };

export type Preview = { light: string; dark: string };

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function root(...parts: string[]) {
  return join(environment.supportPath, "cache", getCatalog().ref, ...parts);
}

export function templatePath(symbol: OpenSymbol) {
  return root("templates", symbol.library.id, `${symbol.name}.svg`);
}

function previewPath(symbol: OpenSymbol, weight: Weight | "strip", mode: "light" | "dark") {
  return root("previews-v2", weight, symbol.library.id, `${symbol.name}.${mode}.svg`);
}

function previewPaths(symbol: OpenSymbol, weight: Weight | "strip"): Preview {
  return { light: previewPath(symbol, weight, "light"), dark: previewPath(symbol, weight, "dark") };
}

async function writeAtomic(path: string, data: string) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, path);
}

// ---------------------------------------------------------------------------
// Template download + parsing
// ---------------------------------------------------------------------------

const inflightTemplates = new Map<string, Promise<string>>();

export function templateUrl(symbol: OpenSymbol) {
  return `https://raw.githubusercontent.com/OrchardKit/open-symbols/${getCatalog().ref}/${symbol.library.id}/symbols/${encodeURIComponent(symbol.name)}.svg`;
}

/** Ensures the SF Symbol template is on disk and returns its path. */
export function ensureTemplate(symbol: OpenSymbol): Promise<string> {
  const path = templatePath(symbol);
  if (existsSync(path)) return Promise.resolve(path);
  let job = inflightTemplates.get(symbol.key);
  if (!job) {
    job = (async () => {
      const res = await fetch(templateUrl(symbol));
      if (!res.ok) throw new Error(`Couldn't download ${symbol.xcodeName} (HTTP ${res.status})`);
      await writeAtomic(path, await res.text());
      return path;
    })().finally(() => inflightTemplates.delete(symbol.key));
    inflightTemplates.set(symbol.key, job);
  }
  return job;
}

function attr(svg: string, id: string, name: string): number | undefined {
  const m = svg.match(new RegExp(`id="${id}"[^>]*?\\s${name}="([-\\d.]+)"`));
  return m ? parseFloat(m[1]) : undefined;
}

export function parseTemplate(svg: string): Template {
  const masters = {} as Record<Master, Glyph>;
  for (const master of ["Ultralight", "Regular", "Black"] as Master[]) {
    const g = svg.match(new RegExp(`<g id="${master}-S"[^>]*>([\\s\\S]*?)</g>`));
    if (!g) throw new Error(`Template is missing the ${master}-S master`);
    const paths = [...g[1].matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]);
    const left = attr(svg, `left-margin-${master}-S`, "x1") ?? 0;
    const right = attr(svg, `right-margin-${master}-S`, "x1") ?? left + 100;
    masters[master] = { paths, width: right - left };
  }
  const baseline = attr(svg, "Baseline-S", "y1") ?? 696;
  const capline = attr(svg, "Capline-S", "y1") ?? baseline - 70.5;
  return { masters, capHeight: baseline - capline };
}

function lerpPath(a: string, b: string, t: number): string {
  if (t === 0 || a === b) return a;
  const bn = b.match(NUM) ?? [];
  let i = 0;
  return a.replace(NUM, (n) => {
    const v = parseFloat(n) + (parseFloat(bn[i++] ?? n) - parseFloat(n)) * t;
    return String(Math.round(v * 1000) / 1000);
  });
}

export function glyphFor(template: Template, weight: Weight): Glyph {
  const [from, to, t] = WEIGHT_MIX[weight];
  const a = template.masters[from];
  const b = template.masters[to];
  return {
    paths: a.paths.map((d, i) => lerpPath(d, b.paths[i] ?? d, t)),
    width: a.width + (b.width - a.width) * t,
  };
}

export type FrameMode = "square" | "tight";

/**
 * Geometry for one weight of a symbol, mapped into a frame of `size` units on
 * its longer side. "square" reproduces the source library's canvas (consistent
 * optical size across icons); "tight" crops to the glyph's exact bounds.
 */
export function drawSymbol(template: Template, weight: Weight, frameMode: FrameMode, size: number) {
  const glyph = glyphFor(template, weight);
  const box = bbox(glyph.paths);
  // Square frames are sized from the Black master so all weights line up.
  const frame =
    frameMode === "tight" && box ? box : squareFrame(bbox(template.masters.Black.paths) ?? box, template.capHeight);
  const k = size / Math.max(frame.w, frame.h);
  return { glyph, frame, k, width: frame.w * k, height: frame.h * k };
}

const r = (n: number) => Math.round(n * 100) / 100;

export function renderGlyphSvg(template: Template, weight: Weight, color: string): string {
  const { glyph, frame, k } = drawSymbol(template, weight, "square", 100);
  const body = transformPaths(glyph.paths, frame, k)
    .map((d) => `<path d="${d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256"><g fill="${color}">${body}</g></svg>`;
}

/** All nine weights side by side, labelled, for the Show Info view. */
export function renderStripSvg(template: Template, color: string, labelColor: string): string {
  const cell = 100;
  const labelSize = 13;
  const height = cell + labelSize * 2.2;
  const cells = WEIGHTS.map((w, i) => {
    const { glyph, frame, k } = drawSymbol(template, w, "square", cell);
    const paths = transformPaths(glyph.paths, frame, k)
      .map((d) => `<path d="${d}"/>`)
      .join("");
    return (
      `<g transform="translate(${i * cell} 0)" fill="${color}">${paths}</g>` +
      `<text x="${r(i * cell + cell / 2)}" y="${r(cell + labelSize * 1.5)}" font-size="${labelSize}" text-anchor="middle" fill="${labelColor}" font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif">${WEIGHT_TITLES[w]}</text>`
    );
  }).join("");
  const width = cell * WEIGHTS.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${r(height)}" width="${width * 4}" height="${Math.round(height * 4)}">${cells}</svg>`;
}

// ---------------------------------------------------------------------------
// Preview rendering with a small concurrency-limited queue
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 10;
let active = 0;
type Waiter = { id: string; start: () => void; cancel: () => void };
const waiting: Waiter[] = [];

/** Thrown for preview jobs nobody needs any more. Not a failure. */
export class PreviewCancelled extends Error {
  constructor() {
    super("Preview no longer needed");
  }
}

const inflightPreviews = new Map<string, Promise<Preview>>();

// How many on-screen views currently want each preview. Queued jobs whose
// count drops to zero are dropped, so a new search doesn't wait behind the
// previews of the one before it.
const interest = new Map<string, number>();

export function retainPreviews(ids: string[]) {
  for (const id of ids) interest.set(id, (interest.get(id) ?? 0) + 1);
}

export function releasePreviews(ids: string[]) {
  const dropped: string[] = [];
  for (const id of ids) {
    const n = (interest.get(id) ?? 0) - 1;
    if (n > 0) interest.set(id, n);
    else {
      interest.delete(id);
      dropped.push(id);
    }
  }
  if (!dropped.length) return;
  // React releases the previous on-screen list just before the next render
  // claims its own, so a symbol that stays on screen is briefly unclaimed.
  // Wait a tick and only cancel what nobody has claimed again.
  setTimeout(() => {
    for (const id of dropped) {
      if (interest.has(id)) continue;
      let cancelled = false;
      for (let i = waiting.length - 1; i >= 0; i--) {
        if (waiting[i].id === id) {
          waiting.splice(i, 1)[0].cancel();
          cancelled = true;
        }
      }
      // Forget a cancelled job now, so a later request starts a fresh one
      // instead of receiving the cancellation. Running jobs are left to finish.
      if (cancelled) inflightPreviews.delete(id);
    }
  }, 0);
}

async function withSlot<T>(id: string, fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((start, reject) =>
      waiting.push({ id, start, cancel: () => reject(new PreviewCancelled()) }),
    );
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.start();
  }
}

/** Downloads (if needed) and parses a symbol's template. */
export async function loadTemplate(symbol: OpenSymbol): Promise<Template> {
  return parseTemplate(await readFile(await ensureTemplate(symbol), "utf8"));
}

/** Returns cached preview paths without doing any work, or undefined. */
export function cachedPreview(symbol: OpenSymbol, weight: Weight | "strip"): Preview | undefined {
  const p = previewPaths(symbol, weight);
  return existsSync(p.light) && existsSync(p.dark) ? p : undefined;
}

/** The key retainPreviews/releasePreviews use for a preview. */
export function previewId(symbol: OpenSymbol, weight: Weight | "strip") {
  return `${getCatalog().ref}|${weight}|${symbol.key}`;
}

export function ensurePreview(symbol: OpenSymbol, weight: Weight | "strip"): Promise<Preview> {
  const cached = cachedPreview(symbol, weight);
  if (cached) return Promise.resolve(cached);
  const id = previewId(symbol, weight);
  let job = inflightPreviews.get(id);
  if (!job) {
    job = withSlot(id, async () => {
      const template = await loadTemplate(symbol);
      const p = previewPaths(symbol, weight);
      if (weight === "strip") {
        await writeAtomic(p.light, renderStripSvg(template, "#000000", "#6E6E73"));
        await writeAtomic(p.dark, renderStripSvg(template, "#FFFFFF", "#98989D"));
      } else {
        await writeAtomic(p.light, renderGlyphSvg(template, weight, "#000000"));
        await writeAtomic(p.dark, renderGlyphSvg(template, weight, "#FFFFFF"));
      }
      return p;
    });
    const current = job;
    // Only clear the entry if it's still this job, not a newer one for the same preview.
    void current
      .finally(() => {
        if (inflightPreviews.get(id) === current) inflightPreviews.delete(id);
      })
      .catch(() => undefined);
    inflightPreviews.set(id, job);
  }
  return job;
}

/**
 * Copies the template to a file named the way Xcode should name the symbol
 * (e.g. "lucide.heart.svg") and returns its path.
 */
export async function exportTemplate(symbol: OpenSymbol, folder: string): Promise<string> {
  const source = await ensureTemplate(symbol);
  await mkdir(folder, { recursive: true });
  const target = join(folder, `${symbol.xcodeName}.svg`);
  await copyFile(source, target);
  return target;
}

export function clipboardFolder() {
  return root("clipboard");
}
