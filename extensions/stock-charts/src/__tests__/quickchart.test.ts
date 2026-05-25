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

  it("includes volume dataset when volumes provided", () => {
    const volumes = [1000, 2000, 3000, 4000, 5000];
    const config = buildChartConfig(labels, prices, true, volumes);
    expect(config.data.datasets).toHaveLength(2);
    expect(config.data.datasets[1].type).toBe("bar");
    expect(config.data.datasets[1].data).toEqual(volumes);
    expect(config.data.datasets[1].yAxisID).toBe("volume");
  });

  it("does not include volume dataset when volumes not provided", () => {
    const config = buildChartConfig(labels, prices, true);
    expect(config.data.datasets).toHaveLength(1);
  });

  it("does not include volume dataset when volumes length mismatches", () => {
    const config = buildChartConfig(labels, prices, true, [1, 2, 3]);
    expect(config.data.datasets).toHaveLength(1);
  });

  it("volume yAxis max is 5x the max volume", () => {
    const volumes = [100, 200, 300, 400, 500];
    const config = buildChartConfig(labels, prices, true, volumes);
    const volAxis = config.options.scales.yAxes.find(
      (a: { id?: string }) => a.id === "volume",
    );
    expect(volAxis).toBeDefined();
    expect(volAxis!.ticks.max).toBe(2500);
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

  it("uses POST when JSON exceeds max GET length", async () => {
    const timestamps = Array.from(
      { length: 60 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from(
      { length: 60 },
      (_, i) => 170.123456789 + i * 0.987654321,
    );
    const volumes = Array.from(
      { length: 60 },
      (_, i) => 10000000 + i * 123456,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://quickchart.io/chart/render/abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = await buildChartUrl(timestamps, prices, "3M", volumes);

    expect(url).toBe("https://quickchart.io/chart/render/abc123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://quickchart.io/chart/create");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("forwards AbortSignal to POST fetch", async () => {
    const timestamps = Array.from(
      { length: 60 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from(
      { length: 60 },
      (_, i) => 170.123456789 + i * 0.987654321,
    );
    const volumes = Array.from(
      { length: 60 },
      (_, i) => 10000000 + i * 123456,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://quickchart.io/chart/render/abc" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await buildChartUrl(timestamps, prices, "3M", volumes, controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("throws when QuickChart POST returns non-ok response", async () => {
    const timestamps = Array.from(
      { length: 60 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from(
      { length: 60 },
      (_, i) => 170.123456789 + i * 0.987654321,
    );
    const volumes = Array.from(
      { length: 60 },
      (_, i) => 10000000 + i * 123456,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      buildChartUrl(timestamps, prices, "3M", volumes),
    ).rejects.toThrow("QuickChart POST failed: 500");
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

  it("includes raycast-width and raycast-height params", async () => {
    const timestamps = [1716120600, 1716120900, 1716121200];
    const prices = [197.1, 197.5, 198.0];

    const md = await buildChartMarkdown(timestamps, prices, "1D");
    expect(md).toContain("raycast-width=600");
    expect(md).toContain("raycast-height=300");
  });

  it("forwards signal to buildChartUrl", async () => {
    const timestamps = Array.from(
      { length: 60 },
      (_, i) => 1700000000 + i * 86400,
    );
    const prices = Array.from(
      { length: 60 },
      (_, i) => 170.123456789 + i * 0.987654321,
    );
    const volumes = Array.from(
      { length: 60 },
      (_, i) => 10000000 + i * 123456,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://quickchart.io/chart/render/sig" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await buildChartMarkdown(timestamps, prices, "3M", volumes, controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
