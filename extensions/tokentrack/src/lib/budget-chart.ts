import { adjustHex, chartFillHex } from "./chart-color";
import { formatCurrencyMoney } from "./format";

const CHART_W = 360;
const CHART_H = 88;

const TRACK_FILL = "#3A3A3C";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapBudgetMarkdown(svg: string): string {
  const b64 = Buffer.from(svg, "utf-8").toString("base64");
  return `\n![](data:image/svg+xml;base64,${b64}?raycast-width=${CHART_W}&raycast-height=${CHART_H})\n`;
}

/** Raycast Detail markdown — horizontal budget progress (SVG, not ASCII). */
export function renderBudgetProgressMarkdown(
  spend: number,
  budget: number,
  currency: string,
  fillHex: string,
): string {
  const pct = budget > 0 ? Math.min(spend / budget, 1) : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;
  const spendStr = formatCurrencyMoney(spend, currency);
  const budgetStr = formatCurrencyMoney(budget, currency);
  const amountLabel = `${spendStr} of ${budgetStr} spent`;

  const barY = 68;
  const barH = 10;
  const fillW = pct > 0 ? Math.max(CHART_W * pct, 6) : 0;
  const chartFill = chartFillHex(fillHex);
  const darkFill = adjustHex(chartFill, 0.72);
  const brightFill = adjustHex(chartFill, 1.06);

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" viewBox="0 0 ${CHART_W} ${CHART_H}" preserveAspectRatio="xMinYMid meet">`,
    `<rect width="100%" height="100%" fill="transparent"/>`,
    "<defs>",
    `<linearGradient id="budgetGrad" x1="0" y1="0" x2="1" y2="0">`,
    `<stop offset="0%" stop-color="${escapeXml(darkFill)}" stop-opacity="0.95"/>`,
    `<stop offset="75%" stop-color="${escapeXml(chartFill)}" stop-opacity="1"/>`,
    `<stop offset="100%" stop-color="${escapeXml(brightFill)}" stop-opacity="1"/>`,
    `</linearGradient>`,
    "</defs>",
    `<text x="0" y="34" fill="#FFFFFF" font-size="28" font-weight="600" font-family="system-ui,-apple-system,sans-serif">${escapeXml(pctLabel)}</text>`,
    `<text x="0" y="54" fill="#AEAEB2" font-size="13" font-family="system-ui,-apple-system,sans-serif">${escapeXml(amountLabel)}</text>`,
    `<rect x="0" y="${barY}" width="${CHART_W}" height="${barH}" rx="5" fill="${TRACK_FILL}" fill-opacity="0.85"/>`,
  ];

  if (fillW > 0) {
    const capR = barH / 2;
    parts.push(
      `<rect x="0" y="${barY}" width="${fillW.toFixed(2)}" height="${barH}" rx="${capR}" fill="url(#budgetGrad)"/>`,
    );
  }

  parts.push(`</svg>`);
  return wrapBudgetMarkdown(parts.join(""));
}
