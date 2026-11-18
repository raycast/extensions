import { describe, expect, it } from "vitest";
import { balanceHistory, calendarDay, historyStart } from "../src/lib/balance-history";
import { historyChart } from "../src/lib/chart";
import type { BalanceEntry } from "../src/lib/types";

const now = new Date(2026, 8, 27);
const entry = (id: number, date: string | null, amount: string, fields: Partial<BalanceEntry> = {}): BalanceEntry => ({
  id,
  reference_date: date,
  amount,
  currency: "NOK",
  type: "CLOSING_BOOKED",
  ...fields,
});

describe("balance history", () => {
  it("sorts dated balances and calculates exact change over the observed interval", () => {
    const result = balanceHistory(
      [entry(2, "2026-09-27", "100.30"), entry(1, "2026-09-01", "100.10")],
      "NOK",
      "30d",
      now,
    );
    expect(result.points.map(({ date }) => date)).toEqual(["2026-09-01", "2026-09-27"]);
    expect(result.change).toBe("0.2");
    expect(result.percent).toBe("0.20");
  });
  it("never mixes currencies or balance types and preserves zero", () => {
    const result = balanceHistory(
      [
        entry(1, "2026-09-01", "0"),
        entry(2, "2026-09-02", "10"),
        entry(3, "2026-09-03", "999", { currency: "USD" }),
        entry(4, "2026-09-04", "888", { type: "INTERIM_AVAILABLE" }),
      ],
      "NOK",
      "all",
      now,
    );
    expect(result.points.map(({ amount }) => amount)).toEqual(["0", "10"]);
    expect(result.percent).toBeUndefined();
  });
  it("uses the latest revision of each date regardless of response ordering", () => {
    const result = balanceHistory(
      [
        entry(3, "2026-09-01", "11", { updated_at: "2026-09-03" }),
        entry(9, "2026-09-01", "10", { updated_at: "2026-09-02" }),
        entry(1, "2026-09-02", "20"),
      ],
      "NOK",
      "all",
      now,
    );
    expect(result.points.map(({ amount }) => amount)).toEqual(["11", "20"]);
  });
  it("excludes undated, invalid, future, and out-of-range observations", () => {
    const result = balanceHistory(
      [
        entry(1, null, "10", { updated_at: "2026-09-24" }),
        entry(2, "2026-02-30", "20"),
        entry(3, "2026-09-28", "30"),
        entry(4, "2026-09-26", "NaN"),
        entry(5, "2026-09-20", "40"),
        entry(6, "2026-09-21", "50"),
      ],
      "NOK",
      "7d",
      now,
    );
    expect(result.points).toEqual([{ date: "2026-09-21", amount: "50" }]);
    expect(result.change).toBeUndefined();
  });
  it("can use a dated available series when settled history is absent", () => {
    const result = balanceHistory(
      [
        entry(1, "2026-09-25", "20", { type: "INTERIM_AVAILABLE", credit_limit_included: true }),
        entry(2, "2026-09-26", "30", { type: "INTERIM_AVAILABLE" }),
      ],
      "NOK",
      "all",
      now,
    );
    expect(result.type).toBe("INTERIM_AVAILABLE");
    expect(result.creditLimitIncluded).toBe(true);
  });
  it("chooses a series with observations in the requested window over old settled history", () => {
    const result = balanceHistory(
      [
        entry(1, "2026-08-01", "10"),
        entry(2, "2026-08-02", "20"),
        entry(3, "2026-09-25", "30", { type: "INTERIM_AVAILABLE" }),
        entry(4, "2026-09-26", "40", { type: "INTERIM_AVAILABLE" }),
      ],
      "NOK",
      "7d",
      now,
    );
    expect(result.type).toBe("INTERIM_AVAILABLE");
    expect(result.points).toHaveLength(2);
  });
  it("clamps month and leap-year ranges without shifting date-only values", () => {
    expect(historyStart("3m", new Date(2026, 4, 31))).toBe("2026-02-28");
    expect(historyStart("1y", new Date(2024, 1, 29))).toBe("2023-02-28");
    expect(historyStart("7d", new Date(2026, 2, 2))).toBe("2026-02-24");
    expect(calendarDay("2026-09-25T00:00:00Z")).toBe("2026-09-25");
  });
});

describe("local balance chart", () => {
  const decode = (uri: string | undefined) => decodeURIComponent(uri!.split(",").slice(1).join(","));
  it("spaces irregular observations by calendar date and uses theme colors", () => {
    const points = [
      { date: "2026-09-01", amount: "0" },
      { date: "2026-09-02", amount: "5" },
      { date: "2026-09-11", amount: "10" },
    ];
    const svg = decode(historyChart(points, "NOK", false));
    expect(svg).toContain("M112.00,");
    expect(svg).toContain("L175.00,");
    expect(svg).toContain("L742.00,");
    expect(svg).toContain("#059669");
    expect(decode(historyChart(points, "NOK", true))).toContain("#34D399");
  });
  it("handles flat and negative series without infinite coordinates", () => {
    for (const amount of ["0", "-500", "500"]) {
      const svg = decode(
        historyChart(
          [
            { date: "2026-09-01", amount },
            { date: "2026-09-02", amount },
          ],
          "NOK",
          false,
        ),
      );
      expect(svg).not.toMatch(/NaN|Infinity/);
      expect(svg.match(/stroke-opacity="0.09"/g)).toHaveLength(1);
    }
  });
  it("rejects insufficient, nonfinite, duplicate, and unsorted observations", () => {
    const point = { date: "2026-09-02", amount: "10" };
    expect(historyChart([point], "NOK", false)).toBeUndefined();
    expect(historyChart([point, point], "NOK", false)).toBeUndefined();
    expect(historyChart([point, { date: "2026-09-01", amount: "1" }], "NOK", false)).toBeUndefined();
    expect(historyChart([point, { date: "2026-09-03", amount: "Infinity" }], "NOK", false)).toBeUndefined();
  });
  it("escapes provider text inserted into SVG labels", () => {
    const svg = decode(
      historyChart(
        [
          { date: "2026-09-01", amount: "1" },
          { date: "2026-09-02", amount: "2" },
        ],
        '<script>"&',
        false,
      ),
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&quot;&amp;");
  });
});
