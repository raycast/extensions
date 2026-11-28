/**
 * Mini QR code preview images (PNG) for each pattern and frame option in the
 * pickers. They're drawn with sips the first time a picker needs them, in the
 * background, and kept in environment.supportPath, so later launches show
 * them at once.
 *
 * Each preview draws the part its picker changes in black and the rest in a
 * light gray, so the tiles differ where the choice does. The eye and center
 * pickers show one corner eye close up: in a whole code the eyes are too
 * small to tell their shapes apart.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { usePromise } from "@raycast/utils";
import type { ErrorLevel, QRSVGOptions } from "qrdx";
import { DEFAULT_FRAME_TEXT, getFrameDimensions, toSVGString } from "qrdx";
import { useState } from "react";
import { FRAME_CHOICES } from "./frames";
import { cacheDir, drawPNG } from "./preview-files";
import { squareSVG } from "./qr-engine";
import { BODY_PATTERNS, CORNER_DOT_PATTERNS, CORNER_EYE_PATTERNS, isCornerDotPattern } from "./types";

const PREVIEW_VALUE = "https://qrdx.dev";
// At level Q the value makes a version 2 code, 25 modules a side; the eye
// close-ups are cut from it by module.
const PREVIEW_LEVEL: ErrorLevel = "Q";
const PREVIEW_MODULES = 25;
const PREVIEW_MARGIN = 1;
// The pickers show three tiles a row, each about 470 px wide on a Retina
// screen, so previews are drawn at 512 px to stay sharp. sips takes as long
// at 512 px as at 64.
const PREVIEW_SIZE = 512;
// Renamed when the drawing changes, so existing installs redraw.
const PREVIEW_DRAWING = "focus";
// How many sips processes draw previews at once.
const DRAWN_AT_ONCE = 4;

/** The part a picker changes. */
const INK = "#000000";
/** Everything else: light enough to step back, dark enough to read on white. */
const MUTED = "#d4d4d4";

/** A picker's previews: body patterns, eye frames, eye centers or frames. */
export type PreviewKind = "body" | "eye" | "dot" | "frame";

/** One option's preview: what it draws and the file it's kept in. */
interface PreviewSpec {
  option: string;
  /** The file's name in the cache folder, without `.png` */
  key: string;
  overrides: Partial<QRSVGOptions>;
  /** Shows the top-left eye close up */
  closeUp: boolean;
}

/** Each picker's options and what their previews draw (nothing is drawn here). */
const PREVIEW_SPECS: Record<PreviewKind, PreviewSpec[]> = {
  body: BODY_PATTERNS.map((p) => ({
    option: p,
    key: `body-${p}`,
    overrides: { bodyPattern: p, eyeColor: MUTED, dotColor: MUTED },
    closeUp: false,
  })),
  // The eye's frame in black, with its namesake center where qrdx has one
  // (circle, leaf, …) and a round center otherwise, in gray.
  eye: CORNER_EYE_PATTERNS.map((p) => ({
    option: p,
    key: `eye-${p}`,
    overrides: {
      cornerEyePattern: p,
      cornerEyeDotPattern: isCornerDotPattern(p) ? p : "circle",
      eyeColor: INK,
      dotColor: MUTED,
    },
    closeUp: true,
  })),
  // The center in black, inside a plain square frame in gray.
  dot: CORNER_DOT_PATTERNS.map((p) => ({
    option: p,
    key: `dot-${p}`,
    overrides: { cornerEyePattern: "square", cornerEyeDotPattern: p, eyeColor: MUTED, dotColor: INK },
    closeUp: true,
  })),
  // Each frame with qrdx's default label and its own colors (they don't
  // follow the code's) around a gray code; no frame is the gray code alone.
  frame: FRAME_CHOICES.map((style) => ({
    option: style,
    key: `frame-${style || "none"}`,
    overrides: { fgColor: MUTED, ...(style ? { frame: { style, text: DEFAULT_FRAME_TEXT } } : {}) },
    closeUp: false,
  })),
};

function renderSVGString(overrides: Partial<QRSVGOptions>): string {
  const svg = toSVGString({
    value: PREVIEW_VALUE,
    size: PREVIEW_SIZE,
    level: PREVIEW_LEVEL,
    fgColor: INK,
    bgColor: "#ffffff",
    margin: PREVIEW_MARGIN,
    ...overrides,
  });
  const frame = overrides.frame;
  if (!frame) return svg;
  // A frame adds space around the code, so the artwork is larger than the
  // tile and seldom square: fit it, centered, on a white square.
  return squareSVG(svg, getFrameDimensions(PREVIEW_SIZE, frame), PREVIEW_SIZE, "#ffffff");
}

/**
 * The top-left corner eye, with the white module of quiet zone above and to
 * the left of it and the white separator below and to the right, filling the
 * whole preview.
 */
function eyeCloseUp(svg: string): string {
  const cell = PREVIEW_SIZE / (PREVIEW_MODULES + 2 * PREVIEW_MARGIN);
  const side = (PREVIEW_MARGIN + 7 + 1) * cell;
  return svg.replace(/viewBox="[^"]*"/, `viewBox="0 0 ${side} ${side}"`);
}

/**
 * The previews' folder: one per qrdx version, preview size and drawing, so an
 * update redraws every preview. The folders of earlier ones are removed.
 */
function previewFolder(): string {
  return cacheDir("previews", PREVIEW_SIZE, PREVIEW_DRAWING);
}

/** The previews of `kind` that are drawn already, by option. */
function drawnPreviews(kind: PreviewKind): Record<string, string> {
  const folder = previewFolder();
  const drawn: Record<string, string> = {};
  for (const spec of PREVIEW_SPECS[kind]) {
    const path = join(folder, `${spec.key}.png`);
    if (existsSync(path)) drawn[spec.option] = path;
  }
  return drawn;
}

// sips runs at most DRAWN_AT_ONCE times at once, whichever pickers ask.
let running = 0;
const waiting: (() => void)[] = [];

async function withSips<T>(task: () => Promise<T>): Promise<T> {
  if (running < DRAWN_AT_ONCE) {
    running++;
  } else {
    // The finishing task hands its turn straight to this one.
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  try {
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

// The previews being drawn, by file, so two pickers never draw one twice.
const drawing = new Map<string, Promise<void>>();

function drawPreview(spec: PreviewSpec, path: string): Promise<void> {
  let pending = drawing.get(path);
  if (!pending) {
    pending = withSips(() => {
      const svg = renderSVGString(spec.overrides);
      return drawPNG(spec.closeUp ? eyeCloseUp(svg) : svg, path, PREVIEW_SIZE);
    }).finally(() => drawing.delete(path));
    drawing.set(path, pending);
  }
  return pending;
}

/**
 * Draws the previews of `kind` that aren't drawn yet and calls `onDrawn`
 * with each one as soon as it's ready. When some fail, the others are still
 * drawn, and it then rejects with the first failure; they're tried again the
 * next time a picker opens.
 */
export async function drawPreviews(kind: PreviewKind, onDrawn?: (option: string, path: string) => void): Promise<void> {
  const folder = previewFolder();
  const missing = PREVIEW_SPECS[kind].filter((spec) => !existsSync(join(folder, `${spec.key}.png`)));
  const results = await Promise.allSettled(
    missing.map(async (spec) => {
      const path = join(folder, `${spec.key}.png`);
      await drawPreview(spec, path);
      onDrawn?.(spec.option, path);
    })
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    const reason = failed[0].reason;
    throw new Error(
      `${failed.length} of ${missing.length} previews could not be drawn: ${reason instanceof Error ? reason.message : String(reason)}`
    );
  }
}

/**
 * A picker's previews, by option: the ones drawn on an earlier launch at
 * once, and the others as they're drawn in the background. `isLoading` is
 * true while any are being drawn. An option without a preview yet has no
 * entry.
 */
export function usePreviews(kind: PreviewKind): { previews: Record<string, string>; isLoading: boolean } {
  const [previews, setPreviews] = useState(() => drawnPreviews(kind));
  const complete = Object.keys(previews).length >= PREVIEW_SPECS[kind].length;
  const { isLoading } = usePromise(
    (k: PreviewKind) => drawPreviews(k, (option, path) => setPreviews((drawn) => ({ ...drawn, [option]: path }))),
    [kind],
    { execute: !complete, failureToastOptions: { title: "Could not draw the pattern previews" } }
  );
  return { previews, isLoading };
}
