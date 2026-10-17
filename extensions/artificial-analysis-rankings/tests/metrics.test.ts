import { describe, expect, it } from "vitest";
import { METRICS, type MetricKey } from "../src/lib/metrics";
import { rankModels } from "../src/lib/models";
import { model } from "./fixtures";

describe("metric leaderboards", () => {
  it.each<[MetricKey, string]>([
    ["intelligence", "high"],
    ["coding", "high"],
    ["speed", "high"],
    ["inputPrice", "low"],
    ["outputPrice", "low"],
    ["latency", "low"],
  ])("sorts %s in the correct direction", (metric, first) => {
    const entries = rankModels(
      [
        model({ id: "low", [metric]: 10 }),
        model({ id: "high", [metric]: 20 }),
        model({ id: "missing", [metric]: null }),
      ],
      metric,
    );
    expect(entries[0].id).toBe(first);
    expect(entries).toHaveLength(2);
    expect(entries[0].metric).toBe(metric);
  });

  it("can rank coding even without an Intelligence Index score", () => {
    expect(rankModels([model({ intelligence: null, coding: 80 })], "coding")[0].value).toBe(80);
  });

  it("switches between input and output pricing without inventing blended prices", () => {
    const models = [
      model({ id: "input", inputPrice: 0.1, outputPrice: 10 }),
      model({ id: "output", inputPrice: 1, outputPrice: 0.2 }),
    ];
    expect(rankModels(models, "inputPrice")[0].id).toBe("input");
    expect(rankModels(models, "outputPrice")[0].id).toBe("output");
    expect(METRICS.inputPrice.unit).toContain("million input tokens");
    expect(METRICS.outputPrice.unit).toContain("million output tokens");
  });

  it("keeps zeros, rejects physically invalid negatives, and assigns raw-value competition ties", () => {
    const ranked = rankModels(
      [
        model({ id: "zero", latency: 0 }),
        model({ id: "a", latency: 0.65 }),
        model({ id: "b", latency: 0.65 }),
        model({ id: "c", latency: 1 }),
        model({ id: "negative", latency: -1 }),
      ],
      "latency",
    );
    expect(ranked.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
    expect(METRICS.latency.format(ranked[0].value)).toBe("0 s");
    expect(METRICS.speed.format(null)).toBe("—");
  });
});
