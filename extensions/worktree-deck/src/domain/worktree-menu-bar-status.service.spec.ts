import { describe, expect, it } from "vitest";

import { worktreeMenuBarStatusService } from "./worktree-menu-bar-status.service";

describe("worktreeMenuBarStatusService", () => {
  it("ユーザー指示待ちは working より優先して黄に集計する", () => {
    const summary = worktreeMenuBarStatusService.summarize([
      {
        titleEntries: [{ status: "working", isWaitingForUser: true }],
      },
    ]);

    expect(summary).toEqual({ blue: 0, green: 0, yellow: 1 });
  });

  it("最新ではないセッションがユーザー指示待ちでも黄に集計する", () => {
    const summary = worktreeMenuBarStatusService.summarize([
      {
        titleEntries: [
          { status: "done", isWaitingForUser: false },
          { status: "working", isWaitingForUser: true },
        ],
      },
    ]);

    expect(summary).toEqual({ blue: 0, green: 0, yellow: 1 });
  });

  it("latest status の done と working を青と緑に集計する", () => {
    const summary = worktreeMenuBarStatusService.summarize([
      {
        titleEntries: [{ status: "done", isWaitingForUser: false }],
      },
      {
        titleEntries: [{ status: "working", isWaitingForUser: false }],
      },
    ]);

    expect(summary).toEqual({ blue: 1, green: 1, yellow: 0 });
  });

  it("セッションなしは集計対象外にする", () => {
    const summary = worktreeMenuBarStatusService.summarize([
      {
        titleEntries: [],
      },
    ]);

    expect(summary).toEqual({ blue: 0, green: 0, yellow: 0 });
  });

  it("メニューバー表示用の文字列を色付き丸と件数で組み立てる", () => {
    const title = worktreeMenuBarStatusService.formatTitle({
      blue: 3,
      green: 1,
      yellow: 2,
    });

    expect(title).toBe("🔵3 🟢1 🟡2");
  });
});
