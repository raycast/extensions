import { describe, expect, it } from "vitest";
import { renderDayDetail, renderTotalsDetail } from "./dashboardDetail";

const totals = {
  inputTokens: 10,
  outputTokens: 20,
  cacheCreationTokens: 30,
  cacheReadTokens: 40,
  totalTokens: 100,
  costUSD: 2.5,
};

describe("renderTotalsDetail", () => {
  it("renders all token categories", () => {
    const markdown = renderTotalsDetail("Today", totals);

    expect(markdown).toContain("# Today");
    expect(markdown).toContain("| Cost | $2.50 |");
    expect(markdown).toContain("| Cache Read Tokens | 40 |");
  });
});

describe("renderDayDetail", () => {
  it("renders a daily usage detail table", () => {
    const markdown = renderDayDetail({
      date: "2026-05-07",
      models: ["claude-sonnet-4-6"],
      ...totals,
    });

    expect(markdown).toContain("May 7");
    expect(markdown).toContain("| Models | claude-sonnet-4-6 |");
  });
});
