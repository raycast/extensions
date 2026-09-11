import { describe, expect, it } from "vitest";

import { chartMarkdownImage, lineChartMarkdownImage, renderCandlestickSvg, renderLineChartSvg } from "./chart";
import type { ChartCandle, PortfolioPoint } from "./types";

const candles: ChartCandle[] = [
  { time: 1, open: 100, high: 110, low: 95, close: 108, volume: 10 },
  { time: 2, open: 108, high: 112, low: 101, close: 102, volume: 11 },
  { time: 3, open: 102, high: 115, low: 99, close: 114, volume: 12 },
];

describe("chart helpers", () => {
  it("renders valid candle SVG without NaN coordinates", () => {
    const svg = renderCandlestickSvg(candles, { width: 640, height: 280, title: "BTC 1h" });

    expect(svg).toContain("<svg");
    expect(svg).toContain("BTC 1h");
    expect(svg).not.toContain("NaN");
    expect(svg).toContain("#16a34a");
    expect(svg).toContain("#dc2626");
  });

  it("returns a Raycast markdown image data URI", () => {
    const markdown = chartMarkdownImage(candles, { width: 640, height: 280, title: "ETH 4h" });

    expect(markdown).toMatch(/^!\[ETH 4h\]\(data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(markdown)).toContain("<svg");
  });

  it("handles empty candle data", () => {
    expect(renderCandlestickSvg([], { title: "No data" })).toContain("No candle data");
  });

  it("draws entry/liq overlay lines within range", () => {
    const svg = renderCandlestickSvg(candles, {
      overlays: [
        { label: "Entry 100", price: 100, color: "#38bdf8" },
        { label: "Liq 95", price: 95, color: "#f97316" },
      ],
    });

    expect(svg).toContain("#38bdf8");
    expect(svg).toContain("Entry 100");
    expect(svg).toContain("stroke-dasharray");
    expect(svg).not.toContain("NaN");
  });
});

describe("line chart helpers", () => {
  const points: PortfolioPoint[] = [
    { time: 1, value: 100 },
    { time: 2, value: 90 },
    { time: 3, value: 130 },
  ];

  it("renders an upward series green and a data URI", () => {
    const svg = renderLineChartSvg(points, { title: "Equity" });
    expect(svg).toContain("polyline");
    expect(svg).toContain("#16a34a");
    expect(svg).not.toContain("NaN");

    const markdown = lineChartMarkdownImage(points, { title: "Equity" });
    expect(markdown).toMatch(/^!\[Equity\]\(data:image\/svg\+xml;utf8,/);
  });

  it("renders a downward series red", () => {
    expect(
      renderLineChartSvg([
        { time: 1, value: 100 },
        { time: 2, value: 50 },
      ]),
    ).toContain("#dc2626");
  });

  it("handles a single point and empty history", () => {
    expect(renderLineChartSvg([{ time: 1, value: 100 }])).not.toContain("NaN");
    expect(renderLineChartSvg([])).toContain("No history yet");
  });
});
