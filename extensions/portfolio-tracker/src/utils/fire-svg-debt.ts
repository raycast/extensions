/**
 * SVG chart builder for the Debt Projection.
 *
 * Generates a horizontal bar chart showing how total debt declines
 * over time as repayments are made. Each bar is split into two
 * stacked segments:
 *
 *   - **Principal** (left, red) — remaining original principal
 *   - **Interest** (right, orange) — interest accrued within the balance
 *
 * The interest label is always displayed ON the bar (never on the RHS)
 * to prevent it from flying off the chart edge.
 *
 * Visual elements:
 *   - Stacked principal + interest bars (declining over time)
 *   - **Debt-free marker** — green highlight on the year debt hits zero
 *   - Year labels (left), total value labels (right)
 *   - Legend at the bottom
 *   - Optional chart title
 *
 * Colour handling follows the same SVG 1.1 approach as fire-svg.ts:
 * all colours use `{ hex, opacity }` pairs with `fill` + `fill-opacity`
 * presentation attributes. CSS `@media (prefers-color-scheme)` rules
 * embedded in `<defs><style>` enable automatic dark/light adaptation.
 *
 * SVG export:
 *   The SVG omits explicit `width` and `height` attributes, relying solely
 *   on the `viewBox` for sizing. This eliminates excess whitespace when
 *   the chart is exported and opened in a browser or image viewer.
 *
 * Zero side effects, zero Raycast imports. Fully testable.
 *
 * @module fire-svg-debt
 */

import {
  SvgColor,
  solid,
  fillAttr,
  cssFillRule,
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
 * A single bar in the debt projection chart.
 *
 * Each bar represents one year and is split into two stacked segments:
 *   - **principalRemaining** (left) — original principal minus what's been repaid
 *   - **interestInBalance** (right) — interest accrued that's now part of the balance
 *
 * These two values sum to `totalDebt`.
 *
 * Pre-computed by the caller (fire-charts.ts) so this module
 * stays free of domain logic.
 */
export interface DebtChartBar {
  /** Calendar year */
  year: number;

  /** Pre-formatted total debt label for the right side (e.g. "£15K") */
  label: string;

  /** Total remaining debt across all positions (principalRemaining + interestInBalance) */
  totalDebt: number;

  /** Remaining original principal (total borrowed minus principal repaid) */
  principalRemaining: number;

  /** Interest accrued that is now part of the outstanding balance */
  interestInBalance: number;

  /** Pre-formatted principal label (e.g. "£12K") */
  principalLabel: string;

  /** Pre-formatted interest-in-balance label (e.g. "£3K") */
  interestLabel: string;

  /** Cumulative interest paid over the life of the debt up to this year */
  cumulativeInterest: number;

  /** True only for the first year where totalDebt reaches zero */
  isDebtFreeYear: boolean;
}

/** Configuration for the debt projection chart. */
export interface DebtChartConfig {
  /** Starting total debt value (for scale reference) */
  startingDebt: number;

  /** Pre-formatted starting debt label */
  startingDebtLabel: string;

  /** Raycast appearance hint (inline fallback; CSS overrides) */
  theme: "light" | "dark";

  /** Optional chart title displayed above the chart area */
  title?: string;

  /**
   * Optional tooltip text embedded as an SVG `<title>` element.
   */
  tooltip?: string;
}

// ──────────────────────────────────────────
// Debt-Chart Palette
// ──────────────────────────────────────────

interface DebtPalette {
  background: SvgColor;
  barTrack: SvgColor;
  /** Colour for the principal (remaining) segment */
  principal: SvgColor;
  /** Colour for the interest-in-balance segment */
  interest: SvgColor;
  /** Green highlight for the debt-free year */
  debtFreeHighlight: SvgColor;
  /** Green accent for debt-free year labels */
  debtFreeAccent: SvgColor;
  text: SvgColor;
  mutedText: SvgColor;
  legendText: SvgColor;
  /** Contrasting text drawn on top of principal bars */
  principalBarLabel: SvgColor;
  /** Contrasting text drawn on top of interest bars */
  interestBarLabel: SvgColor;
}

const DEBT_PALETTES: Record<"light" | "dark", DebtPalette> = {
  dark: {
    background: solid("#23395B"),
    barTrack: { hex: "#B9E3C6", opacity: 0.08 },
    principal: solid("#D81E5B"),
    interest: solid("#59C9A5"),
    debtFreeHighlight: { hex: "#59C9A5", opacity: 0.18 },
    debtFreeAccent: solid("#FFFD98"),
    text: { hex: "#FFFD98", opacity: 0.9 },
    mutedText: { hex: "#B9E3C6", opacity: 0.6 },
    legendText: { hex: "#B9E3C6", opacity: 0.7 },
    principalBarLabel: { hex: "#FFFD98", opacity: 0.9 },
    interestBarLabel: { hex: "#23395B", opacity: 0.85 },
  },
  light: {
    background: solid("#FFFD98"),
    barTrack: { hex: "#23395B", opacity: 0.08 },
    principal: solid("#D81E5B"),
    interest: solid("#59C9A5"),
    debtFreeHighlight: { hex: "#B9E3C6", opacity: 0.2 },
    debtFreeAccent: solid("#23395B"),
    text: { hex: "#23395B", opacity: 0.82 },
    mutedText: { hex: "#23395B", opacity: 0.55 },
    legendText: { hex: "#23395B", opacity: 0.7 },
    principalBarLabel: { hex: "#FFFD98", opacity: 0.95 },
    interestBarLabel: { hex: "#23395B", opacity: 0.85 },
  },
};

// ──────────────────────────────────────────
// CSS Class Names
// ──────────────────────────────────────────

const CLS = {
  bg: "d-bg",
  track: "d-track",
  principal: "d-principal",
  interest: "d-interest",
  freeHl: "d-free-hl",
  free: "d-free",
  text: "d-text",
  muted: "d-muted",
  legend: "d-legend",
  principalLbl: "d-principal-lbl",
  interestLbl: "d-interest-lbl",
} as const;

// ──────────────────────────────────────────
// Layout Constants
// ──────────────────────────────────────────

const PADDING_BASE = { top: 8, right: 82, bottom: 38, left: 50 };
const TITLE_EXTRA_TOP = 20;
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_BAR_LABEL = 9;
const MIN_LABEL_WIDTH = 32;

// ──────────────────────────────────────────
// CSS Builder
// ──────────────────────────────────────────

function buildDebtStyleBlock(): string {
  const light = DEBT_PALETTES.light;
  const dark = DEBT_PALETTES.dark;

  const lightRules = [
    `.${CLS.bg} { ${cssFillRule(light.background)} }`,
    `.${CLS.track} { ${cssFillRule(light.barTrack)} }`,
    `.${CLS.principal} { ${cssFillRule(light.principal)} }`,
    `.${CLS.interest} { ${cssFillRule(light.interest)} }`,
    `.${CLS.freeHl} { ${cssFillRule(light.debtFreeHighlight)} }`,
    `.${CLS.free} { ${cssFillRule(light.debtFreeAccent)} }`,
    `.${CLS.text} { ${cssFillRule(light.text)} }`,
    `.${CLS.muted} { ${cssFillRule(light.mutedText)} }`,
    `.${CLS.legend} { ${cssFillRule(light.legendText)} }`,
    `.${CLS.principalLbl} { ${cssFillRule(light.principalBarLabel)} }`,
    `.${CLS.interestLbl} { ${cssFillRule(light.interestBarLabel)} }`,
  ];

  const darkRules = [
    `.${CLS.bg} { ${cssFillRule(dark.background)} }`,
    `.${CLS.track} { ${cssFillRule(dark.barTrack)} }`,
    `.${CLS.principal} { ${cssFillRule(dark.principal)} }`,
    `.${CLS.interest} { ${cssFillRule(dark.interest)} }`,
    `.${CLS.freeHl} { ${cssFillRule(dark.debtFreeHighlight)} }`,
    `.${CLS.free} { ${cssFillRule(dark.debtFreeAccent)} }`,
    `.${CLS.text} { ${cssFillRule(dark.text)} }`,
    `.${CLS.muted} { ${cssFillRule(dark.mutedText)} }`,
    `.${CLS.legend} { ${cssFillRule(dark.legendText)} }`,
    `.${CLS.principalLbl} { ${cssFillRule(dark.principalBarLabel)} }`,
    `.${CLS.interestLbl} { ${cssFillRule(dark.interestBarLabel)} }`,
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
 * Builds a horizontal bar chart SVG for the debt repayment projection.
 *
 * Each bar is split into two stacked segments:
 *   - **Principal** (left, red) — remaining original principal
 *   - **Interest** (right, orange) — interest accrued within the balance
 *
 * The interest label is always displayed ON the bar (never on the RHS).
 *
 * @param bars   - Pre-computed chart data, one entry per projection year
 * @param config - Starting debt, theme, and optional title
 * @returns Complete SVG document as a string, or empty string if no data
 */
export function buildDebtProjectionSVG(bars: DebtChartBar[], config: DebtChartConfig): string {
  if (bars.length === 0) return "";

  const { startingDebt, theme, title } = config;
  const palette = DEBT_PALETTES[theme];

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

  const maxValue = Math.max(startingDebt, ...bars.map((b) => b.totalDebt));
  if (maxValue <= 0) return "";

  const scaleX = (value: number): number => (value / maxValue) * barAreaWidth;

  // ── SVG elements ──

  const elements: string[] = [];

  // ── 0. Theme CSS ──

  elements.push(buildDebtStyleBlock());

  // ── 0b. Tooltip ──

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

  // ── 4. Debt-free year highlight ──

  for (let i = 0; i < bars.length; i++) {
    if (!bars[i].isDebtFreeYear) continue;
    const y = padTop + i * ROW_HEIGHT - 1;
    elements.push(
      `<rect class="${CLS.freeHl}" x="0" y="${y}" width="${SVG_WIDTH}" height="${BAR_HEIGHT + 2}" ` +
        `${fillAttr(palette.debtFreeHighlight)} rx="3" />`,
    );
  }

  // ── 5. Principal bars (left segment, red) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const principalW = scaleX(bar.principalRemaining);
    if (principalW <= 0) continue;

    const y = padTop + i * ROW_HEIGHT;
    // Only round right edge if there is no interest segment following
    const rx = bar.interestInBalance > 0 ? 0 : 2;

    elements.push(
      `<rect class="${CLS.principal}" x="${padLeft}" y="${y}" width="${principalW}" height="${BAR_HEIGHT}" ` +
        `${fillAttr(palette.principal)} rx="${rx}" />`,
    );
  }

  // ── 6. Interest bars (right segment, orange) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const interestW = scaleX(bar.interestInBalance);
    if (interestW <= 0) continue;

    const principalW = scaleX(bar.principalRemaining);
    const x = padLeft + principalW;
    const y = padTop + i * ROW_HEIGHT;

    elements.push(
      `<rect class="${CLS.interest}" x="${x}" y="${y}" width="${interestW}" height="${BAR_HEIGHT}" ` +
        `${fillAttr(palette.interest)} rx="2" />`,
    );
  }

  // ── 7. Inline bar value labels ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.totalDebt <= 0) continue;

    const textY = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_BAR_LABEL * 0.38;

    // Principal label (on the left/red segment)
    const principalW = scaleX(bar.principalRemaining);
    if (bar.principalLabel && principalW >= MIN_LABEL_WIDTH) {
      elements.push(
        `<text class="${CLS.principalLbl}" x="${padLeft + 4}" y="${textY}" ` +
          `${fillAttr(palette.principalBarLabel)} font-size="${FONT_SIZE_BAR_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">${bar.principalLabel}</text>`,
      );
    }

    // Interest label — ALWAYS displayed on the bar (orange segment), never on the RHS
    const interestW = scaleX(bar.interestInBalance);
    if (bar.interestInBalance > 0 && bar.interestLabel) {
      if (interestW >= MIN_LABEL_WIDTH) {
        // Fits on the interest segment
        const interestX = padLeft + principalW + 4;
        elements.push(
          `<text class="${CLS.interestLbl}" x="${interestX}" y="${textY}" ` +
            `${fillAttr(palette.interestBarLabel)} font-size="${FONT_SIZE_BAR_LABEL}" ` +
            `font-family="${FONT_FAMILY}" text-anchor="start">${bar.interestLabel}</text>`,
        );
      } else {
        // Interest segment too narrow — place label at the right edge of principal,
        // anchored start so it overlaps into the interest area (still on bar)
        const overlapX = padLeft + principalW - 2;
        const totalBarW = scaleX(bar.totalDebt);
        // Only show if there's room on the overall bar
        if (totalBarW >= MIN_LABEL_WIDTH) {
          elements.push(
            `<text class="${CLS.interestLbl}" x="${overlapX}" y="${textY}" ` +
              `${fillAttr(palette.interestBarLabel)} font-size="${FONT_SIZE_BAR_LABEL}" ` +
              `font-family="${FONT_FAMILY}" text-anchor="end">${bar.interestLabel}</text>`,
          );
        }
      }
    }
  }

  // ── 8. Year labels (left of bars) ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const y = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_LABEL * 0.38;
    const cls = bar.isDebtFreeYear ? CLS.free : CLS.text;
    const color = bar.isDebtFreeYear ? palette.debtFreeAccent : palette.text;
    const weight = bar.isDebtFreeYear ? "bold" : "normal";
    elements.push(
      `<text class="${cls}" x="${padLeft - 6}" y="${y}" ` +
        `${fillAttr(color)} font-size="${FONT_SIZE_LABEL}" font-weight="${weight}" ` +
        `font-family="${FONT_FAMILY}" text-anchor="end">${bar.year}</text>`,
    );
  }

  // ── 9. Value labels (right of bars) — total debt only, no interest here ──

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const y = padTop + i * ROW_HEIGHT + BAR_HEIGHT / 2 + FONT_SIZE_LABEL * 0.38;

    if (bar.isDebtFreeYear) {
      // Debt-free year — show celebratory marker
      elements.push(
        `<text class="${CLS.free}" x="${SVG_WIDTH - padRight + 6}" y="${y}" ` +
          `${fillAttr(palette.debtFreeAccent)} font-size="${FONT_SIZE_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">Debt Free! 🎉</text>`,
      );
    } else if (bar.totalDebt <= 0) {
      // Post debt-free — muted "£0"
      elements.push(
        `<text class="${CLS.muted}" x="${SVG_WIDTH - padRight + 6}" y="${y}" ` +
          `${fillAttr(palette.mutedText)} font-size="${FONT_SIZE_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">${bar.label}</text>`,
      );
    } else {
      // Active debt year — just the total debt value (interest is on the bar)
      elements.push(
        `<text class="${CLS.muted}" x="${SVG_WIDTH - padRight + 6}" y="${y}" ` +
          `${fillAttr(palette.mutedText)} font-size="${FONT_SIZE_LABEL}" ` +
          `font-family="${FONT_FAMILY}" text-anchor="start">${bar.label}</text>`,
      );
    }
  }

  // ── 10. Legend ──

  const legendY = padTop + chartAreaHeight + LEGEND_HEIGHT - 4;
  const legendElements = buildDebtLegend(palette, legendY, padLeft, bars);
  elements.push(...legendElements);

  // ── Assemble SVG ──
  // No explicit width/height — viewBox alone controls sizing.
  // This eliminates excess whitespace in exported/opened SVGs.

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${svgHeight}">`,
    ...elements.map((el) => `  ${el}`),
    `</svg>`,
  ].join("\n");
}

// ──────────────────────────────────────────
// Legend Builder
// ──────────────────────────────────────────

function buildDebtLegend(palette: DebtPalette, y: number, padLeft: number, bars: DebtChartBar[]): string[] {
  const els: string[] = [];
  let x = padLeft;

  // ── Principal swatch + label ──
  els.push(
    `<rect class="${CLS.principal}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
      `${fillAttr(palette.principal)} rx="1" />`,
  );
  x += LEGEND_SWATCH + 5;
  els.push(
    `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
      `font-family="${FONT_FAMILY}">Principal</text>`,
  );
  x += measureText("Principal", FONT_SIZE_LEGEND) + LEGEND_ITEM_GAP;

  // ── Interest swatch + label ──
  els.push(
    `<rect class="${CLS.interest}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
      `${fillAttr(palette.interest)} rx="1" />`,
  );
  x += LEGEND_SWATCH + 5;
  els.push(
    `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
      `font-family="${FONT_FAMILY}">Interest</text>`,
  );
  x += measureText("Interest", FONT_SIZE_LEGEND) + LEGEND_ITEM_GAP;

  // ── Debt-free marker in legend (if any bar is debt-free) ──
  if (bars.some((b) => b.isDebtFreeYear)) {
    els.push(
      `<rect class="${CLS.freeHl}" x="${x}" y="${y - LEGEND_SWATCH + 1}" width="${LEGEND_SWATCH}" height="${LEGEND_SWATCH}" ` +
        `${fillAttr(palette.debtFreeAccent)} rx="1" />`,
    );
    x += LEGEND_SWATCH + 5;
    els.push(
      `<text class="${CLS.legend}" x="${x}" y="${y}" ${fillAttr(palette.legendText)} font-size="${FONT_SIZE_LEGEND}" ` +
        `font-family="${FONT_FAMILY}">Debt Free</text>`,
    );
  }

  return els;
}
