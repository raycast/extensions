import { describe, expect, it } from "vitest";

import { worktreeMenuBarSummaryService } from "./worktree-menu-bar-summary.service";

describe("worktreeMenuBarSummaryService", () => {
  it("保存済みメニューバー状態を正規化する", () => {
    expect(
      worktreeMenuBarSummaryService.normalizeStoredSummary({
        summary: { blue: 1, green: 2, yellow: 3 },
        total: 6,
      }),
    ).toEqual({
      summary: { blue: 1, green: 2, yellow: 3 },
      total: 6,
    });
  });

  it("不正な保存値は復元しない", () => {
    expect(
      worktreeMenuBarSummaryService.normalizeStoredSummary({ summary: { blue: 1, green: 0 }, total: 1 }),
    ).toBeNull();
    expect(
      worktreeMenuBarSummaryService.normalizeStoredSummary({
        summary: { blue: 1, green: 0, yellow: 0 },
        total: "1",
      }),
    ).toBeNull();
  });
});
