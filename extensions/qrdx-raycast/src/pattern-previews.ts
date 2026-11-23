/**
 * Generates mini QR code preview images (PNG) for each pattern and frame option.
 * Results are cached to environment.supportPath so sips only runs on first load.
 *
 * Each preview draws the part its picker changes in black and the rest in a
 * light gray, so the tiles differ where the choice does. The eye and center
 * pickers show one corner eye close up: in a whole code the eyes are too
 * small to tell their shapes apart.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  BodyPattern,
  CornerEyeDotPattern,
  CornerEyePattern,
  QRFrame,
} from "qrdx";
import { DEFAULT_FRAME_TEXT, getFrameDimensions, QRCodeSVG } from "qrdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FRAME_CHOICES } from "./frames";
import { cacheDir, drawPNGSync } from "./preview-files";
import { squareSVG } from "./qr-engine";
import {
  BODY_PATTERNS,
  CORNER_DOT_PATTERNS,
  CORNER_EYE_PATTERNS,
  isCornerDotPattern,
} from "./types";

const PREVIEW_VALUE = "https://qrdx.dev";
// At level Q the value makes a version 2 code, 25 modules a side; the eye
// close-ups are cut from it by module.
const PREVIEW_LEVEL = "Q";
const PREVIEW_MODULES = 25;
const PREVIEW_MARGIN = 1;
// The pickers show three tiles a row, each about 470 px wide on a Retina
// screen, so previews are drawn at 512 px to stay sharp. sips takes as long
// at 512 px as at 64.
const PREVIEW_SIZE = 512;
// Renamed when the drawing changes, so existing installs redraw.
const PREVIEW_DRAWING = "focus";

/** The part a picker changes. */
const INK = "#000000";
/** Everything else: light enough to step back, dark enough to read on white. */
const MUTED = "#d4d4d4";

function renderSVGString(overrides: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(QRCodeSVG as any, {
    value: PREVIEW_VALUE,
    size: PREVIEW_SIZE,
    level: PREVIEW_LEVEL,
    fgColor: INK,
    bgColor: "#ffffff",
    margin: PREVIEW_MARGIN,
    ...overrides,
  });
  const svg = renderToStaticMarkup(el);
  const frame = overrides.frame as QRFrame | undefined;
  if (!frame) return svg;
  // A frame adds space around the code, so the artwork is larger than the
  // tile and seldom square: fit it, centered, on a white square.
  return squareSVG(
    svg,
    getFrameDimensions(PREVIEW_SIZE, frame),
    PREVIEW_SIZE,
    "#ffffff"
  );
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

/** Returns the absolute path to a cached PNG for the given key + overrides. */
function previewPNG(
  key: string,
  overrides: Record<string, unknown>,
  closeUp = false
): string {
  // One folder per qrdx version, preview size and drawing, so an update
  // redraws every preview. The folders of earlier ones are removed.
  const dir = cacheDir("previews", PREVIEW_SIZE, PREVIEW_DRAWING);
  const pngPath = join(dir, `${key}.png`);
  if (!existsSync(pngPath)) {
    const svg = renderSVGString(overrides);
    drawPNGSync(closeUp ? eyeCloseUp(svg) : svg, pngPath, PREVIEW_SIZE);
  }
  return pngPath;
}

// ─── Body patterns ────────────────────────────────────────────────────────────

export const bodyPatternPreviews: Record<BodyPattern, string> = (() => {
  const map = {} as Record<BodyPattern, string>;
  for (const p of BODY_PATTERNS) {
    map[p] = previewPNG(`body-${p}`, {
      bodyPattern: p,
      eyeColor: MUTED,
      dotColor: MUTED,
    });
  }
  return map;
})();

// ─── Corner eye patterns ──────────────────────────────────────────────────────

export const cornerEyePatternPreviews: Record<CornerEyePattern, string> =
  (() => {
    const map = {} as Record<CornerEyePattern, string>;
    for (const p of CORNER_EYE_PATTERNS) {
      // The eye's frame in black, with its namesake center where qrdx has
      // one (circle, leaf, …) and a round center otherwise, in gray.
      map[p] = previewPNG(
        `eye-${p}`,
        {
          cornerEyePattern: p,
          cornerEyeDotPattern: isCornerDotPattern(p) ? p : "circle",
          eyeColor: INK,
          dotColor: MUTED,
        },
        true
      );
    }
    return map;
  })();

// ─── Corner dot patterns ──────────────────────────────────────────────────────

export const cornerDotPatternPreviews: Record<CornerEyeDotPattern, string> =
  (() => {
    const map = {} as Record<CornerEyeDotPattern, string>;
    for (const p of CORNER_DOT_PATTERNS) {
      // The center in black, inside a plain square frame in gray.
      map[p] = previewPNG(
        `dot-${p}`,
        {
          cornerEyePattern: "square",
          cornerEyeDotPattern: p,
          eyeColor: MUTED,
          dotColor: INK,
        },
        true
      );
    }
    return map;
  })();

// ─── Frames ───────────────────────────────────────────────────────────────────

// Each frame with qrdx's default label and its own colors (they don't follow
// the code's) around a gray code; no frame is the gray code alone.
export const framePreviews: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const style of FRAME_CHOICES) {
    map[style] = previewPNG(`frame-${style || "none"}`, {
      fgColor: MUTED,
      ...(style ? { frame: { style, text: DEFAULT_FRAME_TEXT } } : {}),
    });
  }
  return map;
})();
