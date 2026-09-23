import { describe, expect, it } from "vitest";

import { formatSourceAge, formatUsageReset, parseClaudeUsageHistory, parseCodexRateLimits } from "../lib/ai-usage";

describe("AI usage parsing", () => {
  it("normalizes Codex windows and hides Spark by default", () => {
    const response = {
      rateLimitsByLimitId: {
        codex: {
          limitId: "codex",
          limitName: "Codex",
          primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: 2_000_000_000 },
          secondary: { usedPercent: 70, windowDurationMins: 10080, resetsAt: 2_000_100_000 },
        },
        spark: {
          limitId: "spark",
          limitName: "Spark",
          primary: { usedPercent: 5, windowDurationMins: 300 },
        },
      },
    };

    const hidden = parseCodexRateLimits(response, false);
    expect(hidden.windows.map((window) => [window.label, window.remainingPercent])).toEqual([
      ["5-hour", 65],
      ["Weekly", 30],
    ]);
    expect(parseCodexRateLimits(response, true).windows).toHaveLength(3);
  });

  it("uses the newest Claude sample and reports remaining quota", () => {
    const usage = parseClaudeUsageHistory(
      JSON.stringify({
        samples: [
          { t: 1000, u: { fh: 50, sd: 60 } },
          { t: 2000, u: { fh: 4, sd: 18 } },
        ],
      }),
    );

    expect(usage.updatedAt).toBe(2000);
    expect(usage.windows.map((window) => window.remainingPercent)).toEqual([96, 82]);
  });

  it("rejects histories without usable quota windows", () => {
    expect(() => parseClaudeUsageHistory('{"samples":[]}')).toThrow("No Claude usage samples found");
  });
});

describe("AI usage time formatting", () => {
  it("formats source age and reset countdowns", () => {
    const now = 2_000_000;
    expect(formatSourceAge(now - 12 * 60_000, now)).toBe("Updated 12m ago");
    expect(formatUsageReset((now + 90 * 60_000) / 1000, now)).toBe("1h 30m");
  });
});
