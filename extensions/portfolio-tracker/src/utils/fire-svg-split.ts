/**
 * SVG chart builder for the accessible vs locked split projection.
 *
 * Generates a stacked horizontal bar chart showing how the projected
 * portfolio breaks down into:
 *
 *   - **Accessible** (ISA/GIA/LISA/Brokerage etc.) — funds that can be
 *     withdrawn at any time.
 *   - **Locked** (SIPP/401K) — funds locked until the pension access age.
 *   - **Unlocked** — locked funds that have passed the SIPP access age
 *     and are now withdrawable.
 *
 * Each bar has two segments with inline value labels (when wide enough).
 * A vertical dashed target line and a horizontal SIPP-access-year marker
 * provide additional context.
 *
 * Reuses shared types and helpers from `fire-svg.ts`.
 *
 * @module fire-svg-split
 */

import {
  SvgColor,
  solid,
  fillAttr,
  strokeAttr,
  cssFillRule,
  cssStrokeRule,
  measureText,
  SVG_WIDTH,
  BAR_HEIGHT,
  ROW_HEIGHT,
  FONT_FAMILY,
  FONT_SIZE_LABEL,
  FONT_SIZE_LEGEND,
  LEGEND_HEIGHT,
  LEGEND_ITEM_GAP,
  LEGEND_SWATCH,
} from "./fire-svg";

// ──────────────────────────────────────────
// Public Types
// ──────────────────────────────────────────

/**
 * A single bar in the accessible/locked split chart.
 *
 * Pre-computed by the caller (`fire-charts.ts`) so this module
 * stays free of domain logic.
 */
export interface SplitChartBar {
  /** Calendar year */
  year: number;

  /** Pre-formatted total value label (right side) */
  label: string;

  /** Value in accessible (ISA/GIA) accounts */
  accessibleValue: number;

  /** Value in locked (SIPP/401K) accounts */
  lockedValue: number;

  /** accessibleValue + lockedValue */
  totalValue: number;

  /** Formatted accessible value for inline bar label */
  accessibleLabel: string;

  /** Formatted locked value for inline bar label */
  lockedLabel: string;

  /** True when the user's age ≥ sippAccessAge in this year */
  isSippAccessible: boolean;

  /** True only for the first year the total hits the FIRE target */
  isFireYear: boolean;
}

/** Configuration for the split projection chart. */
export interface SplitChartConfig {
  /** FIRE target value (for the vertical marker line) */
  targetValue: number;

  /** Pre-formatted target label */
  targetLabel: string;

  /** Optional target year marker (used for 🎯 on the right-side labels) */
  targetYear?: number | null;

  /** Year when SIPP/pension becomes accessible, or null if never in window */
  sippAccessYear: number | null;

  /** Raycast appearance hint (inline fallback; CSS overrides) */
  theme: "light" | "dark";

  /** Optional chart title displayed above the chart area */
  title?: string;

  /**
   * Optional tooltip text embedded as an SVG `<title>` element.
   *
   * When the SVG is opened in a browser (via the "Open Chart" action),
   * hovering over the chart displays this text as a native tooltip.
   * Has no effect inside Raycast's `<img>`-rendered Detail markdown.
   */
  tooltip?: string;
}

// ──────────────────────────────────────────
// Split-Chart Palette
// ──────────────────────────────────────────

interface SplitPalette {
  background: SvgColor;
  barTrack: SvgColor;
  accessible: SvgColor;
  locked: SvgColor;
  unlocked: SvgColor;
  targetLine: SvgColor;
  fireHighlight: SvgColor;
  fireAccent: SvgColor;
  sippLine: SvgColor;
  text: SvgColor;
  mutedText: SvgColor;
  legendText: SvgColor;
  /** Contrasting text on accessible (green) bars */
  accessibleBarLabel: SvgColor;
  /** Contrasting text on locked (amber) / unlocked bars */
  lockedBarLabel: SvgColor;
}

const SPLIT_PALETTES: Record<"light" | "dark", SplitPalette> = {
  dark: {
    background: solid("#23395B"),
    barTrack: { hex: "#B9E3C6", opacity: 0.08 },
    accessible: { hex: "#59C9A5", opacity: 0.8 },
    locked: { hex: "#D81E5B", opacity: 0.65 },
    unlocked: { hex: "#59C9A5", opacity: 0.45 },
    targetLine: solid("#D81E5B"),
    fireHighlight: { hex: "#59C9A5", opacity: 0.18 },
    fireAccent: solid("#FFFD98"),
    sippLine: { hex: "#D81E5B", opacity: 0.55 },
    text: { hex: "#FFFD98", opacity: 0.9 },
    mutedText: { hex: "#B9E3C6", opacity: 0.6 },
    legendText: { hex: "#B9E3C6", opacity: 0.7 },
    accessibleBarLabel: { hex: "#23395B", opacity: 0.7 },
    lockedBarLabel: { hex: "#FFFD98", opacity: 0.85 },
  },
  light: {
    background: solid("#FFFD98"),
    barTrack: { hex: "#23395B", opacity: 0.08 },
    accessible: { hex: "#59C9A5", opacity: 0.7 },
    locked: { hex: "#D81E5B", opacity: 0.55 },
    unlocked: { hex: "#59C9A5", opacity: 0.4 },
    targetLine: solid("#D81E5B"),
    fireHighlight: { hex: "#B9E3C6", opacity: 0.2 },
    fireAccent: solid("#23395B"),
    sippLine: { hex: "#D81E5B", opacity: 0.45 },
    text: { hex: "#23395B", opacity: 0.82 },
    mutedText: { hex: "#23395B", opacity: 0.55 },
    legendText: { hex: "#23395B", opacity: 0.7 },
    accessibleBarLabel: { hex: "#23395B", opacity: 0.75 },
    lockedBarLabel: { hex: "#FFFD98", opacity: 0.9 },
  },
};

// ──────────────────────────────────────────
// CSS Class Names
// ──────────────────────────────────────────

const CLS = {
  bg: "s-bg",
  track: "s-track",
  accessible: "s-acc",
  locked: "s-lock",
  unlocked: "s-unlk",
  target: "s-target",
  fireHl: "s-fire-hl",
  fire: "s-fire",
  sipp: "s-sipp",
  text: "s-text",
  muted: "s-muted",
  legend: "s-legend",
  accLbl: "s-acc-lbl",
  lockLbl: "s-lock-lbl",
} as const;

// ──────────────────────────────────────────
// Layout Constants
// ──────────────────────────────────────────

/** Default padding (no title) */
const PADDING_BASE = { top: 8, right: 82, bottom: 38, left: 50 };

/** Extra top padding when a title is present */
const TITLE_EXTRA_TOP = 20;

/** Font size for the chart title */
const FONT_SIZE_TITLE = 13;

/** Font size for inline bar value labels */
const FONT_SIZE_BAR_LABEL = 9;

/** Minimum bar segment width (px) to render an inline value label */
const MIN_LABEL_WIDTH = 32;

// ──────────────────────────────────────────
// CSS Builder
// ──────────────────────────────────────────

function buildSplitStyleBlock(): string {
  const light = SPLIT_PALETTES.light;
  const dark = SPLIT_PALETTES.dark;

  const lightRules = [
    `.${CLS.bg} { ${cssFillRule(light.background)} }`,
    `.${CLS.track} { ${cssFillRule(light.barTrack)} }`,
    `.${CLS.accessible} { ${cssFillRule(light.accessible)} }`,
    `.${CLS.locked} { ${cssFillRule(light.locked)} }`,
    `.${CLS.unlocked} { ${cssFillRule(light.unlocked)} }`,
    `.${CLS.target} { ${cssStrokeRule(light.targetLine)} }`,
    `.${CLS.fireHl} { ${cssFillRule(light.fireHighlight)} }`,
    `.${CLS.fire} { ${cssFillRule(light.fireAccent)} }`,
    `.${CLS.sipp} { ${cssStrokeRule(light.sippLine)} }`,
    `.${CLS.text} { ${cssFillRule(light.text)} }`,
    `.${CLS.muted} { ${cssFillRule(light.mutedText)} }`,
    `.${CLS.legend} { ${cssFillRule(light.legendText)} }`,
    `.${CLS.accLbl} { ${cssFillRule(light.accessibleBarLabel)} }`,
    `.${CLS.lockLbl} { ${cssFillRule(light.lockedBarLabel)} }`,
  ];

  const darkRules = [
    `.${CLS.bg} { ${cssFillRule(dark.background)} }`,
    `.${CLS.track} { ${cssFillRule(dark.barTrack)} }`,
    `.${CLS.accessible} { ${cssFillRule(dark.accessible)} }`,
    `.${CLS.locked} { ${cssFillRule(dark.locked)} }`,
    `.${CLS.unlocked} { ${cssFillRule(dark.unlocked)} }`,
    `.${CLS.target} { ${cssStrokeRule(dark.targetLine)} }`,
    `.${CLS.fireHl} { ${cssFillRule(dark.fireHighlight)} }`,
    `.${CLS.fire} { ${cssFillRule(dark.fireAccent)} }`,
    `.${CLS.sipp} { ${cssStrokeRule(dark.sippLine)} }`,
    `.${CLS.text} { ${cssFillRule(dark.text)} }`,
    `.${CLS.muted} { ${cssFillRule(dark.mutedText)} }`,
    `.${CLS.legend} { ${cssFillRule(dark.legendText)} }`,
    `.${CLS.accLbl} { ${cssFillRule(dark.accessibleBarLabel)} }`,
    `.${CLS.lockLbl} { ${cssFillRule(dark.lockedBarLabel)} }`,
  ];

  return [
    "<defs>",
    "  <style>",
    `    @media (prefers-color-scheme: light) {`,
    ...lightRules.map((r) => `      ${r}`),
    "    }",
    `    @media (prefers-color-scheme: dark) {`,
    ...darkRules.map((r) => `      ${r}`),
    "    }",
    "  </style>",
    "</defs>",
  ].join("\n");
}

// ──────────────────────────────────────────
// Main Builder
// ──────────────────────────────────────────

/**
 * Builds a stacked horizontal bar chart SVG for the accessible vs locked
 * portfolio split projection.
 *
 * @param bars   - Pre-computed split chart data, one entry per projection year
 * @param config - Target value, label, SIPP year, theme, and optional title
 * @returns Complete SVG document as a string, or empty string if no data
 */
export function buildSplitProjectionSVG(bars: SplitChartBar[], config: SplitChartConfig): string {
  if (bars.length === 0) return "";

  const { targetValue, targetLabel, targetYear, sippAccessYear, theme, title } = config;
  const palette = SPLIT_PALETTES[theme];

  // ── Dimensions ──

  const hasTitle = !!title;
  const padTop = PADDING_BASE.top + (hasTitle ? TITLE_EXTRA_TOP : 0);
  const padRight = PADDING_BASE.right;
  const padBottom = PADDING_BASE.bottom;
  const padLeft = PADDING_BASE.left;
  const barAreaWidth = SVG_WIDTH - padLeft - padRight;

  const chartAreaHeight = bars.length * ROW_HEIGHT;
  const svgHeight = padTop + chartAreaHeight + padBottom;

  // ── Scale ──

  const maxValue = Math.max(...bars.map((b) => b.totalValue), targetValue);
  if (maxValue <= 0) return "";

  const scaleX = (value: number): number => (value / maxValue) * barAreaWidth;

  const targetX = padLeft + scaleX(targetValue);

  // ── SVG elements ──

  const elements: string[] = [];

  // ── 0. Theme CSS ──

  elements.push(buildSplitStyleBlock());

  // ── 0b. Tooltip (SVG <title> — shows on hover in browsers) ──

  if (config.tooltip) {
    const escaped = config.tooltip.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    elements.push(`<title>${escaped}</title>`);
  }

  // ── 1. Background ──

  elements.push(
    `<rect class="${CLS.bg}" x="0" y="0" width="${SVG_WIDTH}" height="${svgHeight}" ` +
      `${fillAttr(palette.background)} rx="6" />`,
  );

  // ── 2. Title (optional) ──

  if (hasTitle) {
    const titleY = PADDING_BASE.top + FONT_SIZE_TITLE * 0.38 + 2;
    elements.push(
      `<text class="${CLS.text}" x="${padLeft}" y="${titleY}" ` +
        `${fillAttr(palette.text)} font-size="${FONT_SIZE_TITLE}" font-weight="600" ` +
        `font-family="${FONT_FAMILY}" text-anchor="start">${title}</text>`,
    );
  }

  // ── 3. Bar track backgrounds ──

  for (let i = 0; i < bars.length; i++) {
    const y = padTop + i * ROW_HEIGHT;
    elements.push(
      `<rect class="${CLS.track}" x="${padLeft}" y="${y}" width="${barAreaWidth}" height="${BAR_HEIGHT}" ` +
        `${fillAttr(palette.barTrack)} rx="2" />`,
    );
  }

  // ── 4. FIRE year highlight ──

  for (let i = 0; i < bars.length; i++) {
    if (!bars[i].isFireYear) continue;
    const y = padTop + i * ROW_HEIGHT - 1;
    elements.push(
      `<rect class="${CLS.fireHl}" x="0" y="${y}" width="${SVG_WIDTH}" height="${BAR_HEIGHT + 2}" ` +
        `${fillAttr(palette.fireHighlight)} rx="3" />`,
    );
  }

  // ── 5. Accessible bars (left segment) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const w = scaleX(bar.accessibleValue);
    if (w <= 0) continue;

    const y = padTop + i * ROW_HEIGHT;
    const rx = bar.lockedValue > 0 ? 0 : 2;
    elements.push(
      `<rect class="${CLS.accessible}" x="${padLeft}" y="${y}" width="${w}" height="${BAR_HEIGHT}" ` +
        `${fillAttr(palette.accessible)} rx="${rx}" />`,
    );
  }

  // ── 6. Locked / Unlocked bars (right segment) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const lockedW = scaleX(bar.lockedValue);
    if (lockedW <= 0) continue;

    const accW = scaleX(bar.accessibleValue);
    const x = padLeft + accW;
    const y = padTop + i * ROW_HEIGHT;

    // After SIPP access age, use the "unlocked" colour
    const cls = bar.isSippAccessible ? CLS.unlocked : CLS.locked;
    const color = bar.isSippAccessible ? palette.unlocked : palette.locked;

    elements.push(
      `<rect class="${cls}" x="${x}" y="${y}" width="${lockedW}" height="${BAR_HEIGHT}" ` +
        `${fillAttr(color)} rx="2" />`,
    );
  }

  // ── 7. Inline bar value labels ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const textY = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_BAR_LABEL * 0.38;

    // Accessible label
    const accW = scaleX(bar.accessibleValue);
    if (bar.accessibleLabel && accW >= MIN_LABEL_WIDTH) {
      elements.push(
        `<text class="${CLS.accLbl}" x="${padLeft + 4}" y="${textY}" ` +
          `${fillAttr(palette.accessibleBarLabel)} font-size="${FONT_SIZE_BAR_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">${bar.accessibleLabel}</text>`,
      );
    }

    // Locked / unlocked label
    const lockedW = scaleX(bar.lockedValue);
    if (bar.lockedLabel && lockedW >= MIN_LABEL_WIDTH) {
      const lockedX = padLeft + accW + 4;
      elements.push(
        `<text class="${CLS.lockLbl}" x="${lockedX}" y="${textY}" ` +
          `${fillAttr(palette.lockedBarLabel)} font-size="${FONT_SIZE_BAR_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">${bar.lockedLabel}</text>`,
      );
    }
  }

  // ── 8. SIPP access year marker line (horizontal dashed) ──

  if (sippAccessYear !== null) {
    const sippBarIndex = bars.findIndex((b) => b.year === sippAccessYear);
    if (sippBarIndex >= 0) {
      const markerY = padTop + sippBarIndex * ROW_HEIGHT - 1;
      elements.push(
        `<line class="${CLS.sipp}" x1="${padLeft}" y1="${markerY}" x2="${padLeft + barAreaWidth}" y2="${markerY}" ` +
          `${strokeAttr(palette.sippLine)} stroke-width="1" stroke-dasharray="4,3" />`,
      );
    }
  }

  // ── 9. Target line (vertical dashed) ──

  const targetLineY1 = padTop - 2;
  const targetLineY2 = padTop + chartAreaHeight + 2;
  elements.push(
    `<line class="${CLS.target}" x1="${targetX}" y1="${targetLineY1}" x2="${targetX}" y2="${targetLineY2}" ` +
      `${strokeAttr(palette.targetLine)} stroke-width="1.5" stroke-dasharray="4,3" />`,
  );

  // ── 10. Year labels (left of bars) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const y = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_LABEL * 0.38;
    const cls = bar.isFireYear ? CLS.fire : CLS.text;
    const color = bar.isFireYear ? palette.fireAccent : palette.text;
    const weight = bar.isFireYear ? "bold" : "normal";
    elements.push(
      `<text class="${cls}" x="${padLeft - 6}" y="${y}" ` +
        `${fillAttr(color)} font-size="${FONT_SIZE_LABEL}" font-weight="${weight}" ` +
        `font-family="${FONT_FAMILY}" text-anchor="end">${bar.year}</text>`,
    );
  }

  // ── 11. Value labels (right of bars) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const y = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_LABEL * 0.38;
    const cls = bar.isFireYear ? CLS.fire : CLS.muted;
    const color = bar.isFireYear ? palette.fireAccent : palette.mutedText;
    const markerParts: string[] = [];
    if (targetYear !== undefined && targetYear !== null && bar.year === targetYear) {
      markerParts.push("🎯");
    }
    if (bar.isFireYear) {
      markerParts.push("🔥");
    }
    const suffix = markerParts.length > 0 ? `  ${markerParts.join(" ")}` : "";
    elements.push(
      `<text class="${cls}" x="${SVG_WIDTH - padRight + 6}" y="${y}" ` +
        `${fillAttr(color)} font-size="${FONT_SIZE_LABEL}" ` +
        `font-family="${FONT_FAMILY}" text-anchor="start">${bar.label}${suffix}</text>`,
    );
  }

  // ── 12. Legend ──

  const legendY = padTop + chartAreaHeight + LEGEND_HEIGHT - 4;
  const legendElements = buildSplitLegend(palette, targetLabel, legendY, padLeft, bars);
  elements.push(...legendElements);

  // ── Assemble SVG ──

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${svgHeight}">`,
    ...elements.map((el) => `  ${el}`),
    `</svg>`,
  ].join("\n");
}

// ──────────────────────────────────────────
// Legend
// ──────────────────────────────────────────

/**
 * Builds the legend for the split chart.
 *
 * Layout: ■ Accessible  ■ Locked  [■ Unlocked]  │ Target
 *
 * The "Unlocked" item only appears if any bar has `isSippAccessible`.
 */
function buildSplitLegend(
  palette: SplitPalette,
  targetLabel: string,
  y: number,
  padLeft: number,
  bars: SplitChartBar[],
): string[] {
  const els: string[] = [];
  let x = padLeft;

  const hasSippUnlocked = bars.some((b) => b.isSippAccessible && b.lockedValue > 0);

  // ── Accessible swatch + label ──
  els.push(
    `<rect class="${CLS.accessible}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
      `${fillAttr(palette.accessible)} rx="1" />`,
  );
  x += LEGEND_SWATCH + 5;
  els.push(
    `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
      `font-family="${FONT_FAMILY}">Accessible</text>`,
  );
  x += measureText("Accessible", FONT_SIZE_LEGEND) + LEGEND_ITEM_GAP;

  // ── Locked swatch + label ──
  els.push(
    `<rect class="${CLS.locked}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
      `${fillAttr(palette.locked)} rx="1" />`,
  );
  x += LEGEND_SWATCH + 5;
  els.push(
    `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
      `font-family="${FONT_FAMILY}">Locked</text>`,
  );
  x += measureText("Locked", FONT_SIZE_LEGEND) + LEGEND_ITEM_GAP;

  // ── Unlocked swatch + label (only if relevant) ──
  if (hasSippUnlocked) {
    els.push(
      `<rect class="${CLS.unlocked}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
        `${fillAttr(palette.unlocked)} rx="1" />`,
    );
    x += LEGEND_SWATCH + 5;
    els.push(
      `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
        `font-family="${FONT_FAMILY}">Unlocked</text>`,
    );
    x += measureText("Unlocked", FONT_SIZE_LEGEND) + LEGEND_ITEM_GAP;
  }

  // ── Target line indicator + label ──
  const lineY = y - LEGEND_SWATCH / 2 + 1;
  els.push(
    `<line class="${CLS.target}" x1="${x}" y1="${lineY}" x2="${x + LEGEND_SWATCH}" y2="${lineY}" ` +
      `${strokeAttr(palette.targetLine)} stroke-width="1.5" stroke-dasharray="3,2" />`,
  );
  x += LEGEND_SWATCH + 5;
  els.push(
    `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
      `font-family="${FONT_FAMILY}">${targetLabel} Target</text>`,
  );

  return els;
}
