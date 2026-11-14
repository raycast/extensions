import { changeSpans, type ChangeSegment } from "./change-line";
import { FIGURE_ROW_HEIGHT, renderFigures, type Figure } from "./figures";
import { num, truncate } from "./shared";
import { DETAIL_CHART_WIDTH, escapeXml, svgDocument, svgToMarkdown } from "./svg";
import { chartTheme, type Appearance } from "./theme";

/**
 * The heading above a chart (label, big amount, optional change line) drawn into the same image as
 * the chart. Raycast's markdown spacing can't be set, so this is how the gaps stay exact:
 * label → amount 12, amount → change 4, last line → chart 20 (measured between line boxes).
 */
export interface Headline {
  label: string;
  amount: string;
  change?: ChangeSegment[];
}

const LINE_HEIGHT = 1.2;
const LABEL_SIZE = 13;
const AMOUNT_SIZE = 22;
const CHANGE_SIZE = 14;
const GAP_LABEL_AMOUNT = 12;
const GAP_AMOUNT_CHANGE = 4;
const GAP_TO_CHART = 20;
const GAP_TO_FIGURES = 20;
/** Baseline offset inside a line box (SF's ascent ≈ 0.95em). */
const BASELINE = 0.95;
/** Height of the tallest letters above the baseline (≈ 0.76em). */
const ASCENDER = 0.76;
/** The label's line box starts this far above the image so its letters touch the top edge. */
const TOP_TRIM = LABEL_SIZE * (BASELINE - ASCENDER);

export interface HeadlineLayout {
  labelTop: number;
  labelHeight: number;
  amountTop: number;
  amountHeight: number;
  changeTop: number | null;
  changeHeight: number;
  chartTop: number;
}

export function headlineLayout(h: Headline): HeadlineLayout {
  const labelHeight = LABEL_SIZE * LINE_HEIGHT;
  const amountHeight = AMOUNT_SIZE * LINE_HEIGHT;
  const changeHeight = CHANGE_SIZE * LINE_HEIGHT;
  const labelTop = -TOP_TRIM;
  const amountTop = labelTop + labelHeight + GAP_LABEL_AMOUNT;
  const amountBottom = amountTop + amountHeight;
  const changeTop = h.change && h.change.length > 0 ? amountBottom + GAP_AMOUNT_CHANGE : null;
  const lastBottom = changeTop === null ? amountBottom : changeTop + changeHeight;
  return {
    labelTop,
    labelHeight,
    amountTop,
    amountHeight,
    changeTop,
    changeHeight,
    chartTop: lastBottom + GAP_TO_CHART,
  };
}

/** The chart document's contents, without its outer <svg> element. */
function innerOf(doc: string): string {
  return doc.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

export function withHeadline(
  h: Headline,
  /** null for a headline with only figure rows below it. */
  chartSvg: string | null,
  chartHeight: number,
  opts: { width: number; appearance: Appearance; figures?: Figure[] },
): { svg: string; height: number } {
  const theme = chartTheme(opts.appearance);
  const l = headlineLayout(h);
  const font = `font-family="${theme.fontFamily}"`;
  const label = truncate(h.label, Math.floor(opts.width / (LABEL_SIZE * 0.55)));
  let inner = `<text x="0" y="${num(l.labelTop + LABEL_SIZE * BASELINE)}" fill="${theme.text}" font-size="${LABEL_SIZE}" ${font}>${escapeXml(label)}</text>`;
  inner += `<text x="0" y="${num(l.amountTop + AMOUNT_SIZE * BASELINE)}" fill="${theme.text}" font-size="${AMOUNT_SIZE}" font-weight="700" ${font}>${escapeXml(h.amount)}</text>`;
  if (l.changeTop !== null && h.change) {
    inner += `<text x="0" y="${num(l.changeTop + CHANGE_SIZE * BASELINE)}" font-size="${CHANGE_SIZE}" ${font} xml:space="preserve">${changeSpans(h.change, theme)}</text>`;
  }
  let height: number;
  if (chartSvg === null) {
    height = l.chartTop - GAP_TO_CHART;
  } else {
    inner += `<g transform="translate(0,${l.chartTop})">${innerOf(chartSvg)}</g>`;
    height = l.chartTop + chartHeight;
  }
  const figures = opts.figures ?? [];
  if (figures.length > 0) {
    const top = height + GAP_TO_FIGURES;
    const rows = renderFigures(figures, { width: opts.width, appearance: opts.appearance });
    inner += `<g transform="translate(0,${top})">${innerOf(rows)}</g>`;
    height = top + figures.length * FIGURE_ROW_HEIGHT;
  }
  return { svg: svgDocument(inner, opts.width, height), height };
}

/** Headline + chart (+ figure rows 20 below) as one full-width markdown image. */
export function headlineChartMarkdown(
  h: Headline,
  chartSvg: string,
  chartHeight: number,
  appearance: Appearance,
  alt: string,
  figures: Figure[] = [],
): string {
  const { svg, height } = withHeadline(h, chartSvg, chartHeight, { width: DETAIL_CHART_WIDTH, appearance, figures });
  return svgToMarkdown(svg, DETAIL_CHART_WIDTH, Math.ceil(height), alt);
}

/** Headline with figure rows 20 below it (no chart) as one full-width markdown image. */
export function headlineMarkdown(h: Headline, appearance: Appearance, alt: string, figures: Figure[]): string {
  const { svg, height } = withHeadline(h, null, 0, { width: DETAIL_CHART_WIDTH, appearance, figures });
  return svgToMarkdown(svg, DETAIL_CHART_WIDTH, Math.ceil(height), alt);
}
