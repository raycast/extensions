import { describe, it, expect } from "vitest";
import { INTERVALS } from "../types";
import { INTERVAL_CONFIG } from "../chart/intervals";
import { INTERVAL_MAP } from "../yahoo-finance/chart";

describe("INTERVALS constant", () => {
  it("has exactly 9 entries", () => {
    expect(INTERVALS).toHaveLength(9);
  });

  it("is in correct order", () => {
    expect(INTERVALS).toEqual([
      "1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y", "5Y",
    ]);
  });
});

describe("INTERVAL_CONFIG", () => {
  it("has a config entry for every interval", () => {
    for (const iv of INTERVALS) {
      expect(INTERVAL_CONFIG[iv]).toBeDefined();
      expect(INTERVAL_CONFIG[iv].label).toBeTruthy();
      expect(typeof INTERVAL_CONFIG[iv].formatLabel).toBe("function");
    }
  });

  it("1D formats as HH:mm", () => {
    const ts = 1716120600; // 2024-05-19 13:30 UTC
    const label = INTERVAL_CONFIG["1D"].formatLabel(ts);
    expect(label).toMatch(/^\d{2}:\d{2}$/);
  });

  it("1W formats with weekday and time", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["1W"].formatLabel(ts);
    expect(label).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{2}:\d{2}$/);
  });

  it("1M formats as Month Day", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["1M"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+$/,
    );
  });

  it("3M formats as Month Day", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["3M"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+$/,
    );
  });

  it("6M formats as Month Day", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["6M"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+$/,
    );
  });

  it("YTD formats as Month Day", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["YTD"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d+$/,
    );
  });

  it("1Y formats as Month name only", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["1Y"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
    );
  });

  it("2Y formats as Month 'YY", () => {
    const ts = 1716120600; // 2024
    const label = INTERVAL_CONFIG["2Y"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) '\d{2}$/,
    );
  });

  it("5Y formats as Month Year", () => {
    const ts = 1716120600;
    const label = INTERVAL_CONFIG["5Y"].formatLabel(ts);
    expect(label).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/,
    );
  });

  describe("labels", () => {
    it("YTD label is 'Year to Date'", () => {
      expect(INTERVAL_CONFIG["YTD"].label).toBe("Year to Date");
    });

    it("2Y label is '2 Years'", () => {
      expect(INTERVAL_CONFIG["2Y"].label).toBe("2 Years");
    });
  });
});

describe("INTERVAL_MAP — Yahoo Finance API params", () => {
  it("has an entry for every interval", () => {
    for (const iv of INTERVALS) {
      expect(INTERVAL_MAP[iv]).toBeDefined();
      expect(INTERVAL_MAP[iv].range).toBeTruthy();
      expect(INTERVAL_MAP[iv].interval).toBeTruthy();
    }
  });

  it("YTD maps to range ytd and interval 1d", () => {
    expect(INTERVAL_MAP["YTD"]).toEqual({ range: "ytd", interval: "1d" });
  });

  it("2Y maps to range 2y and interval 1wk", () => {
    expect(INTERVAL_MAP["2Y"]).toEqual({ range: "2y", interval: "1wk" });
  });
});
