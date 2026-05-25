import { describe, expect, it, vi } from "vitest";

import type { ListWorktreesResult } from "./application/list-worktrees.usecase";
import type { WorktreeTitle } from "./application/worktree-title.entity";

vi.mock("@raycast/api", () => {
  return {
    Color: {
      Blue: "blue",
      Green: "green",
      Red: "red",
      Yellow: "yellow",
    },
    Icon: new Proxy(
      {},
      {
        get: () => "icon",
      },
    ),
    MenuBarExtra: Object.assign(
      vi.fn(() => null),
      {
        Item: vi.fn(() => null),
        Section: vi.fn(() => null),
      },
    ),
    environment: { assetsPath: "/assets" },
    getPreferenceValues: vi.fn(() => ({})),
    openExtensionPreferences: vi.fn(),
  };
});

import { loadWorktreeMenuBarSummaryWithDependencies } from "./worktree-status-menu-bar";
import type { WorktreeMenuBarSummarySnapshot } from "./domain/worktree-menu-bar-summary.service";

/**
 * テスト用セッションタイトルを作成する
 */
function buildTitle(args: { status: WorktreeTitle["status"]; isWaitingForUser?: boolean }): WorktreeTitle {
  return {
    title: "session",
    latestMessage: null,
    updatedAt: 100,
    status: args.status,
    sessionKind: "main",
    isWaitingForUser: args.isWaitingForUser,
  };
}

describe("loadWorktreeMenuBarSummaryWithDependencies", () => {
  it("キャッシュではなく実値を取得してメニューバー状態を保存する", async () => {
    const listed: ListWorktreesResult = {
      basePath: "/base",
      mappings: [],
      worktrees: [
        { repo: "repo", path: "/worktree/done", branch: "done" },
        { repo: "repo", path: "/worktree/working", branch: "working" },
        { repo: "repo", path: "/worktree/waiting", branch: "waiting" },
      ],
      isCacheHit: false,
    };
    const listWorktrees = vi.fn(async () => listed);
    const loadTitlesForPaths = vi.fn(async () => {
      return new Map<string, WorktreeTitle[]>([
        ["/worktree/done", [buildTitle({ status: "done" })]],
        ["/worktree/working", [buildTitle({ status: "working" })]],
        ["/worktree/waiting", [buildTitle({ status: "working", isWaitingForUser: true })]],
      ]);
    });
    const saveLastSummary = vi.fn<(_snapshot: WorktreeMenuBarSummarySnapshot) => Promise<void>>(async () => undefined);

    const result = await loadWorktreeMenuBarSummaryWithDependencies({
      dependencies: {
        listWorktrees,
        loadTitlesForPaths,
        saveLastSummary,
      },
    });

    expect(listWorktrees).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { preferCache: false },
      }),
    );
    expect(result).toEqual({
      summary: { blue: 1, green: 1, yellow: 1 },
      total: 3,
    });
    expect(saveLastSummary).toHaveBeenCalledWith(result);
  });
});
