import { describe, expect, it } from "vitest";
import { activeCostProviders, parseCostCli } from "../../src/lib/cost";
import fixture from "../fixtures/cost-cli.json";

describe("parseCostCli", () => {
  const costs = parseCostCli(fixture);
  const claude = costs.find((c) => c.provider === "claude")!;

  it("sorts days newest first and models by cost", () => {
    expect(claude.days.map((d) => d.date)).toEqual(["2026-11-07", "2026-11-06"]);
    expect(claude.days[1].models.map((m) => m.model)).toEqual(["model-a", "model-b"]);
    expect(claude.days[1]).toMatchObject({ cost: 10, tokens: 2_500_000, cacheReadTokens: 2_400_000 });
  });

  it("maps totals", () => {
    expect(claude).toMatchObject({
      todayCost: 2.5,
      last30DaysCost: 12.5,
      last30DaysTokens: 3_000_000,
      currency: "USD",
    });
  });

  it("captures object and string errors", () => {
    expect(costs.find((c) => c.provider === "cursor")?.error).toBe("Not signed in to Cursor");
    expect(parseCostCli([{ provider: "x", error: "boom" }])[0].error).toBe("boom");
  });

  it("keeps only providers with activity and no error", () => {
    expect(activeCostProviders(costs).map((c) => c.provider)).toEqual(["claude"]);
  });

  it("rejects non-array output", () => {
    expect(() => parseCostCli(null)).toThrow();
  });
});
