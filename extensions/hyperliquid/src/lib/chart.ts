import type { ChartCandle, PortfolioPoint } from "./types";

/** A horizontal reference line drawn across a chart (e.g. entry or liquidation price). */
export interface ChartOverlay {
  label: string;
  price: number;
  color: string;
}

interface ChartOptions {
  width?: number;
  height?: number;
  title?: string;
  overlays?: ChartOverlay[];
}

interface LineChartOptions extends ChartOptions {
  /** Forces the line colour; defaults to green/red based on net change. */
  lineColor?: string;
  /** Formats the y-axis tick labels. Defaults to a 2/6-decimal number. */
  formatValue?: (value: number) => string;
}

const GREEN = "#16a34a";
const RED = "#dc2626";
const GRID = "#334155";
const TEXT = "#cbd5e1";
const BACKGROUND = "#0f172a";
const ENTRY = "#38bdf8";
const LIQUIDATION = "#f97316";

function defaultTick(value: number): string {
  return value.toFixed(Math.abs(value) >= 1 ? 2 : 6);
}

function renderOverlays(
  overlays: ChartOverlay[],
  yMin: number,
  yMax: number,
  plotHeight: number,
  padding: { top: number; left: number; right: number },
  width: number,
): string {
  return overlays
    .filter((overlay) => Number.isFinite(overlay.price) && overlay.price >= yMin && overlay.price <= yMax)
    .map((overlay) => {
      const y = scale(overlay.price, yMin, yMax, plotHeight, padding.top);
      return `<line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${width - padding.right}" y2="${y.toFixed(2)}" stroke="${overlay.color}" stroke-width="1.25" stroke-dasharray="5 4" opacity="0.9"/><text x="${width - padding.right - 4}" y="${(y - 4).toFixed(2)}" fill="${overlay.color}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="end">${escapeXml(overlay.label)}</text>`;
    })
    .join("");
}

export { ENTRY as ENTRY_COLOR, LIQUIDATION as LIQUIDATION_COLOR };

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function scale(value: number, min: number, max: number, height: number, top: number): number {
  if (max === min) {
    return top + height / 2;
  }

  return top + ((max - value) / (max - min)) * height;
}

export function renderCandlestickSvg(candles: ChartCandle[], options: ChartOptions = {}): string {
  const width = options.width ?? 720;
  const height = options.height ?? 320;
  const title = options.title ?? "Candles";
  const padding = { top: 38, right: 18, bottom: 28, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (candles.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${BACKGROUND}"/><text x="${width / 2}" y="${height / 2}" fill="${TEXT}" font-family="Inter, system-ui, sans-serif" font-size="16" text-anchor="middle">No candle data</text></svg>`;
  }

  const overlays = options.overlays ?? [];
  const overlayPrices = overlays.map((overlay) => overlay.price).filter((price) => Number.isFinite(price));
  const lows = candles.map((candle) => candle.low);
  const highs = candles.map((candle) => candle.high);
  const minPrice = Math.min(...lows, ...overlayPrices);
  const maxPrice = Math.max(...highs, ...overlayPrices);
  const rangePadding = (maxPrice - minPrice || maxPrice || 1) * 0.08;
  const yMin = minPrice - rangePadding;
  const yMax = maxPrice + rangePadding;
  const slot = plotWidth / candles.length;
  const bodyWidth = Math.max(3, Math.min(18, slot * 0.58));

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = padding.top + (plotHeight / 3) * index;
    const value = yMax - ((yMax - yMin) / 3) * index;
    return `<line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${width - padding.right}" y2="${y.toFixed(2)}" stroke="${GRID}" stroke-width="1" opacity="0.45"/><text x="${padding.left - 8}" y="${(y + 4).toFixed(2)}" fill="${TEXT}" font-family="Inter, system-ui, sans-serif" font-size="11" text-anchor="end">${value.toFixed(value >= 1 ? 2 : 6)}</text>`;
  }).join("");

  const candleShapes = candles
    .map((candle, index) => {
      const x = padding.left + slot * index + slot / 2;
      const highY = scale(candle.high, yMin, yMax, plotHeight, padding.top);
      const lowY = scale(candle.low, yMin, yMax, plotHeight, padding.top);
      const openY = scale(candle.open, yMin, yMax, plotHeight, padding.top);
      const closeY = scale(candle.close, yMin, yMax, plotHeight, padding.top);
      const color = candle.close >= candle.open ? GREEN : RED;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));

      return `<line x1="${x.toFixed(2)}" y1="${highY.toFixed(2)}" x2="${x.toFixed(2)}" y2="${lowY.toFixed(2)}" stroke="${color}" stroke-width="1.5"/><rect x="${(x - bodyWidth / 2).toFixed(2)}" y="${bodyTop.toFixed(2)}" width="${bodyWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}" rx="1.5" fill="${color}"/>`;
    })
    .join("");

  const overlayShapes = renderOverlays(overlays, yMin, yMax, plotHeight, padding, width);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${BACKGROUND}"/><text x="${padding.left}" y="24" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600">${escapeXml(title)}</text>${gridLines}${candleShapes}${overlayShapes}</svg>`;
}

export function chartMarkdownImage(candles: ChartCandle[], options: ChartOptions = {}): string {
  const title = options.title ?? "Candles";
  const svg = renderCandlestickSvg(candles, options);
  return `![${title}](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;
}

export function renderLineChartSvg(points: PortfolioPoint[], options: LineChartOptions = {}): string {
  const width = options.width ?? 720;
  const height = options.height ?? 320;
  const title = options.title ?? "Series";
  const formatValue = options.formatValue ?? defaultTick;
  const padding = { top: 38, right: 18, bottom: 28, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${BACKGROUND}"/><text x="${width / 2}" y="${height / 2}" fill="${TEXT}" font-family="Inter, system-ui, sans-serif" font-size="16" text-anchor="middle">No history yet</text></svg>`;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rangePadding = (maxValue - minValue || Math.abs(maxValue) || 1) * 0.08;
  const yMin = minValue - rangePadding;
  const yMax = maxValue + rangePadding;
  const lineColor = options.lineColor ?? (values[values.length - 1] >= values[0] ? GREEN : RED);

  const xFor = (index: number) =>
    points.length === 1 ? padding.left + plotWidth / 2 : padding.left + (plotWidth / (points.length - 1)) * index;

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = padding.top + (plotHeight / 3) * index;
    const value = yMax - ((yMax - yMin) / 3) * index;
    return `<line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${width - padding.right}" y2="${y.toFixed(2)}" stroke="${GRID}" stroke-width="1" opacity="0.45"/><text x="${padding.left - 8}" y="${(y + 4).toFixed(2)}" fill="${TEXT}" font-family="Inter, system-ui, sans-serif" font-size="11" text-anchor="end">${escapeXml(formatValue(value))}</text>`;
  }).join("");

  const linePoints = points.map((point, index) => {
    const x = xFor(index);
    const y = scale(point.value, yMin, yMax, plotHeight, padding.top);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const baselineY = padding.top + plotHeight;
  const areaPath = `M ${linePoints[0]} L ${linePoints.join(" ")} L ${xFor(points.length - 1).toFixed(2)},${baselineY.toFixed(2)} L ${xFor(0).toFixed(2)},${baselineY.toFixed(2)} Z`;
  const polyline = `<polyline points="${linePoints.join(" ")}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const area = `<path d="${areaPath}" fill="${lineColor}" opacity="0.12"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${BACKGROUND}"/><text x="${padding.left}" y="24" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600">${escapeXml(title)}</text>${gridLines}${area}${polyline}</svg>`;
}

export function lineChartMarkdownImage(points: PortfolioPoint[], options: LineChartOptions = {}): string {
  const title = options.title ?? "Series";
  const svg = renderLineChartSvg(points, options);
  return `![${title}](data:image/svg+xml;utf8,${encodeURIComponent(svg)})`;
}
