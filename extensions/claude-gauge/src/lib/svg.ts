import { environment } from "@raycast/api";
import { thresholdHex } from "./format";

/**
 * SVG "limit card" generator for the Session command.
 *
 * Raycast `Detail` markdown renders images, including base64 `data:` URIs, so we
 * draw each reset-countdown card as an SVG and embed it as a markdown image.
 * This lets us size the countdown up into a true visual HERO (markdown text
 * alone cannot enlarge type) and draw a smooth, rounded, color-threshold gauge.
 *
 * Everything degrades gracefully: an unknown percentage renders a neutral track
 * with no fill, and an unknown countdown should be passed in as a placeholder
 * (e.g. "—"). No code path can emit `NaN`.
 */

export type LimitCard = {
  /** Small label shown uppercased, e.g. `5-Hour` → `5-HOUR · RESETS IN`. */
  label: string;
  /** The hero countdown text, e.g. `1h 48m`, `4d 20h`, `now`, or `—`. */
  countdown: string;
  /** Usage percent 0–100 — drives the bar width and the threshold color. */
  percentUsed: number | null;
  /** Caption line, e.g. `50% used · resets 2:30 PM`. */
  caption: string;
  /**
   * Optional suffix appended to the uppercased label after a ` · ` separator
   * (e.g. `5-HOUR · RESETS IN`). Defaults to `RESETS IN`. Pass an empty string
   * to render the label alone with no separator (e.g. `THIS MONTH · JUNE`).
   */
  labelSuffix?: string;
  /**
   * Optional small right-aligned label above the percentage, rendered
   * uppercased. Defaults to `USED`.
   */
  valueLabel?: string;
};

type Palette = {
  /** Muted/secondary text. */
  muted: string;
  /** Progress track (unfilled) color. */
  track: string;
};

const CARD_WIDTH = 560;
const CARD_HEIGHT = 150;
const PAD_X = 28;
const TRACK_Y = 104;
const TRACK_H = 14;
const TRACK_R = 7;
const CONTENT_W = CARD_WIDTH - PAD_X * 2;
const RIGHT_X = CARD_WIDTH - PAD_X;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, Roboto, sans-serif";

function palette(): Palette {
  return environment.appearance === "dark"
    ? { muted: "#8B949E", track: "#30363D" }
    : { muted: "#6E7781", track: "#D0D7DE" };
}

/** Escape a string for safe inclusion in XML text/attribute content. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Round to a safe finite integer (never `NaN`). */
function round(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function buildSvg(card: LimitCard): string {
  const pal = palette();
  const pct = card.percentUsed;
  const hasPct = pct != null && Number.isFinite(pct);
  const clamped = hasPct ? Math.min(100, Math.max(0, pct as number)) : 0;
  const accent = (hasPct && thresholdHex(clamped)) || pal.muted;

  // Fill width: nothing at 0%/unknown; at least a rounded nub once non-zero.
  let fillW = (CONTENT_W * clamped) / 100;
  if (hasPct && clamped > 0) fillW = Math.max(TRACK_H, fillW);
  fillW = Math.min(CONTENT_W, fillW);

  const suffix = (card.labelSuffix ?? "RESETS IN").toUpperCase();
  const labelText = suffix
    ? `${card.label.toUpperCase()} · ${suffix}`
    : card.label.toUpperCase();
  const label = escapeXml(labelText);
  const valueLabel = escapeXml((card.valueLabel ?? "USED").toUpperCase());
  const countdownText = escapeXml(card.countdown);
  const caption = escapeXml(card.caption);
  const percentText = hasPct ? `${round(clamped)}%` : "—";

  const fillRect =
    hasPct && clamped > 0
      ? `<rect x="${PAD_X}" y="${TRACK_Y}" width="${round(fillW)}" height="${TRACK_H}" rx="${TRACK_R}" fill="${accent}"/>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="16" fill="${pal.track}" fill-opacity="0.16" stroke="${pal.track}" stroke-opacity="0.5"/>
  <text x="${PAD_X}" y="32" font-family="${FONT_STACK}" font-size="13" font-weight="600" letter-spacing="1.4" fill="${pal.muted}">${label}</text>
  <text x="${RIGHT_X}" y="32" text-anchor="end" font-family="${FONT_STACK}" font-size="12" font-weight="600" letter-spacing="1.4" fill="${pal.muted}">${valueLabel}</text>
  <text x="${PAD_X}" y="86" font-family="${FONT_STACK}" font-size="48" font-weight="700" fill="${accent}">${countdownText}</text>
  <text x="${RIGHT_X}" y="86" text-anchor="end" font-family="${FONT_STACK}" font-size="48" font-weight="700" fill="${accent}">${percentText}</text>
  <rect x="${PAD_X}" y="${TRACK_Y}" width="${CONTENT_W}" height="${TRACK_H}" rx="${TRACK_R}" fill="${pal.track}"/>
  ${fillRect}
  <text x="${PAD_X}" y="140" font-family="${FONT_STACK}" font-size="13" font-weight="500" fill="${pal.muted}">${caption}</text>
</svg>`;
}

/** Build the base64 `data:image/svg+xml` URI for one limit card. */
export function limitCardDataUri(card: LimitCard): string {
  const base64 = Buffer.from(buildSvg(card), "utf8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/** Build a ready-to-embed markdown image (`![alt](data:…)`) for one limit card. */
export function limitCardImage(card: LimitCard, alt = "limit"): string {
  return `![${alt}](${limitCardDataUri(card)})`;
}
