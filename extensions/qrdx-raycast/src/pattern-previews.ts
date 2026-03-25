/**
 * Generates mini QR code preview images (PNG) for each pattern/template option.
 * Results are cached to environment.supportPath so sips only runs on first load.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";
import type { BodyPattern, CornerEyeDotPattern, CornerEyePattern } from "qrdx";
import { QRCodeSVG } from "qrdx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const PREVIEW_VALUE = "https://qrdx.dev";
const PREVIEW_SIZE = 64;

function renderSVGString(overrides: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = createElement(QRCodeSVG as any, {
    value: PREVIEW_VALUE,
    size: PREVIEW_SIZE,
    fgColor: "#000000",
    bgColor: "#ffffff",
    margin: 1,
    ...overrides,
  });
  return renderToStaticMarkup(el);
}

function getCacheDir(): string {
  const dir = join(environment.supportPath, "previews");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns the absolute path to a cached PNG for the given key + overrides. */
function previewPNG(key: string, overrides: Record<string, unknown>): string {
  const cacheDir = getCacheDir();
  const pngPath = join(cacheDir, `${key}.png`);

  if (!existsSync(pngPath)) {
    const svgPath = join(cacheDir, `${key}.svg`);
    const svgString = renderSVGString(overrides);
    writeFileSync(
      svgPath,
      `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`,
      "utf-8",
    );
    execSync(
      `sips -s format png "${svgPath}" --out "${pngPath}" --resampleHeightWidth ${PREVIEW_SIZE} ${PREVIEW_SIZE} 2>/dev/null`,
      { stdio: "pipe" },
    );
  }

  return pngPath;
}

// ─── Body patterns ────────────────────────────────────────────────────────────

const BODY_PATTERN_VALUES: BodyPattern[] = [
  "square",
  "circle",
  "circle-large",
  "diamond",
  "circle-mixed",
  "pacman",
  "rounded",
  "small-square",
  "vertical-line",
];

export const bodyPatternPreviews: Record<BodyPattern, string> = (() => {
  const map = {} as Record<BodyPattern, string>;
  for (const p of BODY_PATTERN_VALUES) {
    map[p] = previewPNG(`body-${p}`, { bodyPattern: p });
  }
  return map;
})();

// ─── Corner eye patterns ──────────────────────────────────────────────────────

const CORNER_EYE_PATTERN_VALUES: CornerEyePattern[] = [
  "square",
  "rounded",
  "gear",
  "circle",
  "diya",
  "extra-rounded",
  "message",
  "pointy",
  "curly",
];

export const cornerEyePatternPreviews: Record<CornerEyePattern, string> =
  (() => {
    const map = {} as Record<CornerEyePattern, string>;
    for (const p of CORNER_EYE_PATTERN_VALUES) {
      map[p] = previewPNG(`eye-${p}`, {
        cornerEyePattern: p,
        cornerEyeDotPattern: p as unknown as CornerEyeDotPattern,
      });
    }
    return map;
  })();

// ─── Corner dot patterns ──────────────────────────────────────────────────────

const CORNER_DOT_PATTERN_VALUES: CornerEyeDotPattern[] = [
  "square",
  "rounded",
  "circle",
  "diamond",
  "message",
  "message-reverse",
  "diya",
  "diya-reverse",
  "rounded-triangle",
  "star",
  "banner",
];

export const cornerDotPatternPreviews: Record<CornerEyeDotPattern, string> =
  (() => {
    const map = {} as Record<CornerEyeDotPattern, string>;
    for (const p of CORNER_DOT_PATTERN_VALUES) {
      map[p] = previewPNG(`dot-${p}`, { cornerEyeDotPattern: p });
    }
    return map;
  })();

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATE_VALUES = [
  "",
  "Arrow",
  "StandardBox",
  "SquareBorder",
  "StrikedBox",
  "Halloween",
] as const;

export const templatePreviews: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const t of TEMPLATE_VALUES) {
    map[t] = previewPNG(`template-${t || "none"}`, t ? { templateId: t } : {});
  }
  return map;
})();
