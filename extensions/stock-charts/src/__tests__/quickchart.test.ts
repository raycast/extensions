import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  buildChartConfig,
  buildChartUrl,
  buildChartMarkdown,
} from "../chart/quickchart";

describe("buildChartConfig", () => {
  const labels = ["09:30", "09:35", "09:40", "09:45", "09:50"];
  const prices = [197.1, 197.5, 198.0, 198.2, 198.42];

  it("returns a line chart type", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.type).toBe("line");
  });

  it("includes correct labels and data", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.data.labels).toEqual(labels);
    expect(config.data.datasets[0].data).toEqual(prices);
  });

  it("uses green border color when isUp is true", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.data.datasets[0].borderColor).toBe("#34C759");
  });

  it("uses red border color when isUp is false", () => {
    const config = buildChartConfig(labels, prices, false);
    expect(config.data.datasets[0].borderColor).toBe("#FF3B30");
  });

  it("has pointRadius 0", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.data.datasets[0].pointRadius).toBe(0);
  });

  it("has fill set to true", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.data.datasets[0].fill).toBe(true);
  });

  it("has legend display set to false", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.options.legend.display).toBe(false);
  });
});

describe("buildChartUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a GET URL for small datasets", async () => {
    const timestamps = [
      1716120600, 1716120900, 1716121200, 1716121500, 1716121800,
    ];
    const prices = [197.1, 197.5, 198.0, 198.2, 198.42];

    const url = await buildChartUrl(timestamps, prices, "1D");
    expect(url).toMatch(/^https:\/\/quickchart\.io\/chart\?/);
    expect(url).toContain("w=600");
    expect(url).toContain("h=300");
  });

  it("downsamples when more than 80 data points", async () => {
    const timestamps = Array.from(
      { length: 365 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from({ length: 365 }, (_, i) => 170 + i * 0.08);

    const url = await buildChartUrl(timestamps, prices, "1Y");
    expect(url).toMatch(/^https:\/\/quickchart\.io\/chart/);
    const decoded = decodeURIComponent(url);
    const dataMatch = decoded.match(/"data":\[([^\]]+)\]/);
    expect(dataMatch).toBeTruthy();
    const dataPoints = dataMatch![1].split(",").length;
    expect(dataPoints).toBeLessThanOrEqual(65);
    expect(dataPoints).toBeGreaterThanOrEqual(55);
  });
});

describe("buildChartMarkdown", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns markdown image string containing chart URL", async () => {
    const timestamps = [1716120600, 1716120900, 1716121200];
    const prices = [197.1, 197.5, 198.0];

    const md = await buildChartMarkdown(timestamps, prices, "1D");
    expect(md).toContain("![Stock Chart](");
    expect(md).toContain("quickchart.io");
  });
});
