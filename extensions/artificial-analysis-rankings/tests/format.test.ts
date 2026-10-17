import { describe, expect, it } from "vitest";
import { detailMetrics, formatAge, formatPrice, formatRank, modelSummary, modelUrl } from "../src/lib/format";
import { METRICS } from "../src/lib/metrics";
import { rankModels } from "../src/lib/models";
import { buildStandings, standingsFor } from "../src/lib/standings";
import { model, NOW, snapshot } from "./fixtures";

const defaults = { showCoding: false, showPrice: false, showSpeed: false };
const everything = { showCoding: true, showPrice: true, showSpeed: true };

describe("display and copy formatting", () => {
  it("shows Intelligence Index, latency, and the active metric by default", () => {
    expect(detailMetrics(defaults, "intelligence")).toEqual(["intelligence", "latency"]);
    expect(detailMetrics(defaults, "speed")).toEqual(["intelligence", "speed", "latency"]);
    expect(detailMetrics(defaults, "outputPrice")).toEqual(["intelligence", "latency", "inputPrice", "outputPrice"]);
  });

  it("allows each optional statistic independently, in grouped display order", () => {
    expect(detailMetrics({ ...defaults, showCoding: true }, "intelligence")).toEqual([
      "intelligence",
      "coding",
      "latency",
    ]);
    expect(detailMetrics({ ...defaults, showPrice: true }, "intelligence")).toEqual([
      "intelligence",
      "latency",
      "inputPrice",
      "outputPrice",
    ]);
    expect(detailMetrics({ ...defaults, showSpeed: true }, "latency")).toEqual(["intelligence", "speed", "latency"]);
    expect(detailMetrics(everything, "coding")).toEqual([
      "intelligence",
      "coding",
      "speed",
      "latency",
      "inputPrice",
      "outputPrice",
    ]);
  });

  it("ranks every metric across all configurations and leaves unmeasured metrics unranked", () => {
    const models = [
      model({ id: "a", intelligence: 70, speed: 50, inputPrice: 2 }),
      model({ id: "b", intelligence: 60, speed: null, inputPrice: 1 }),
      model({ id: "c", intelligence: 60, speed: 90, inputPrice: -1 }),
    ];
    const table = buildStandings(models);
    const [intelligence, , speed, , inputPrice] = standingsFor(models[1], table);
    expect(intelligence).toEqual({ metric: "intelligence", value: 60, rank: 2, total: 3 });
    expect(speed).toEqual({ metric: "speed", value: null, rank: undefined, total: 2 });
    expect(inputPrice).toEqual({ metric: "inputPrice", value: 1, rank: 1, total: 2 });
    expect(standingsFor(models[2], table, ["inputPrice"])).toEqual([
      { metric: "inputPrice", value: null, rank: undefined, total: 2 },
    ]);
    expect(formatRank(2, 3)).toBe("#2 of 3");
    expect(formatRank(undefined, 3)).toBe("Not ranked");
  });

  it("distinguishes unavailable values from measured zeros", () => {
    const keys = ["coding", "inputPrice", "outputPrice", "speed"] as const;
    const missing = model({ coding: null, inputPrice: null, outputPrice: null, speed: null });
    expect(keys.map((key) => METRICS[key].format(missing[key]))).toEqual(["—", "—", "—", "—"]);
    const zero = model({ intelligence: 0, coding: 0, inputPrice: 0, outputPrice: 0, speed: 0 });
    expect(keys.map((key) => METRICS[key].format(zero[key]))).toEqual(["0.0", "$0.00", "$0.00", "0 t/s"]);
    expect(METRICS.intelligence.format(zero.intelligence)).toBe("0.0");
  });

  it("preserves small token prices rather than rounding them to zero", () => {
    expect(formatPrice(0.000125)).toBe("$0.000125");
    expect(formatPrice(0.000000001)).toBe("$1.00e-9");
    expect(formatPrice(null)).toBe("—");
  });

  it("copies displayed statistics, source, version, and retrieval time", () => {
    const entry = rankModels([model()])[0];
    const basic = modelSummary(entry, snapshot(), defaults);
    expect(basic).toContain("#1 Alpha (High) — Example Lab");
    expect(basic).toContain("Intelligence Index v4.3: 50");
    expect(basic).toContain("https://artificialanalysis.ai/models/alpha-high");
    expect(basic).toContain("Retrieved: 2026-10-17T08:00:00.000Z");
    expect(basic).not.toContain("Coding Index:");
    const full = modelSummary(entry, snapshot(), everything);
    expect(full).toContain("Coding Index: 42");
    expect(full).toContain("$0.25 input / $1.50 output");
    expect(full).toContain("150.5 tokens/s");
  });

  it("keeps model slugs inside a single URL path segment", () => {
    expect(modelUrl("model/config?x=1")).toBe("https://artificialanalysis.ai/models/model%2Fconfig%3Fx%3D1");
  });

  it("shows cache age across minute, hour, and day boundaries", () => {
    expect(formatAge(NOW, NOW)).toBe("just now");
    expect(formatAge(NOW, NOW + 120_000)).toBe("2m ago");
    expect(formatAge(NOW, NOW + 3_600_000)).toBe("1h ago");
    expect(formatAge(NOW, NOW + 172_800_000)).toBe("2d ago");
  });
});
