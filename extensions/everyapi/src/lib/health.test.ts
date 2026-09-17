import { describe, expect, it } from "vitest";
import {
  compactHistoryIndicators,
  sortProviders,
  statusFreshness,
} from "./health";

describe("health view", () => {
  it("sorts critical providers before degraded and operational", () => {
    const providers = sortProviders([
      { id: "ok", name: "OK", indicator: "none", fetched_at: 1 },
      { id: "down", name: "Down", indicator: "critical", fetched_at: 1 },
      { id: "slow", name: "Slow", indicator: "minor", fetched_at: 1 },
    ]);
    expect(providers.map((provider) => provider.id)).toEqual([
      "down",
      "slow",
      "ok",
    ]);
  });

  it("labels stale data explicitly", () => {
    expect(statusFreshness(100, 100 + 31 * 60)).toBe("Stale · 31m ago");
    expect(statusFreshness(100, 120)).toBe("Updated 20s ago");
  });

  it("compacts 24 hourly samples into 12 two-hour worst-case buckets", () => {
    const indicators = Array.from({ length: 24 }, () => "none");
    indicators[3] = "minor";
    indicators[10] = "critical";

    expect(compactHistoryIndicators(indicators)).toEqual([
      "none",
      "minor",
      "none",
      "none",
      "none",
      "critical",
      "none",
      "none",
      "none",
      "none",
      "none",
      "none",
    ]);
  });

  it("keeps short histories unchanged", () => {
    expect(compactHistoryIndicators(["none", "major"])).toEqual([
      "none",
      "major",
    ]);
  });
});
