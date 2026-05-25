import { describe, expect, it } from "vitest";

import type { RepositoryMapping } from "../domain/repository-mapping.service";
import type { Worktree } from "./worktree.entity";
import type { WorktreeTitle } from "./worktree-title.entity";
import {
  applyWorktreeDeckDisplayCache,
  buildWorktreeDeckDisplayCache,
  hasWorktreeDeckDisplayCacheData,
  normalizeWorktreeDeckDisplayCache,
  type WorktreeDeckDisplayCache,
} from "./worktree-deck-display-cache";

/**
 * テスト用のタイトルを作成する
 */
function buildTitle(args: {
  title: string;
  latestMessage: string | null;
  updatedAt: number;
  status?: "working" | "done" | null;
  sessionKind?: WorktreeTitle["sessionKind"];
  isWaitingForUser?: boolean;
  skillUsages?: WorktreeTitle["skillUsages"];
}): WorktreeTitle {
  return {
    title: args.title,
    latestMessage: args.latestMessage,
    updatedAt: args.updatedAt,
    status: args.status ?? null,
    sessionKind: args.sessionKind ?? "main",
    isWaitingForUser: args.isWaitingForUser,
    skillUsages: args.skillUsages,
  };
}

/**
 * テスト用の worktree を作成する
 */
function buildWorktree(args: {
  repo: string;
  path: string;
  branch: string;
  originPath?: string;
  titleEntries?: WorktreeTitle[];
  mergeStatus?: Worktree["mergeStatus"];
  lastCommitAt?: string | null;
  baseRef?: string | null;
  aheadCount?: number | null;
  behindCount?: number | null;
}): Worktree {
  return {
    repo: args.repo,
    path: args.path,
    branch: args.branch,
    originPath: args.originPath,
    titleEntries: args.titleEntries,
    mergeStatus: args.mergeStatus,
    lastCommitAt: args.lastCommitAt,
    baseRef: args.baseRef,
    aheadCount: args.aheadCount,
    behindCount: args.behindCount,
  };
}

/**
 * テスト用 mapping を作成する
 */
function buildMapping(repoRoot: string, mapValue: string): RepositoryMapping {
  return {
    repoRoot,
    mapValue,
  };
}

describe("buildWorktreeDeckDisplayCache", () => {
  it("読み込み後の表示データをキャッシュ可能な形式へ変換する", () => {
    const title = buildTitle({
      title: "作業を完了した",
      latestMessage: "done",
      updatedAt: 100,
      status: "done",
      skillUsages: [{ name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" }],
    });
    const cache = buildWorktreeDeckDisplayCache({
      worktrees: [
        buildWorktree({
          repo: "repo",
          path: "/tmp/repo/feature-a",
          branch: "feature-a",
          originPath: "/tmp/repo",
          titleEntries: [title],
          mergeStatus: "no-commit",
          lastCommitAt: "2026-03-25 09:42",
          baseRef: "main",
          aheadCount: 0,
          behindCount: 0,
        }),
      ],
      titlesByPath: new Map([["/tmp/repo", [title]]]),
      originLastCommitByPath: new Map([["/tmp/repo", "2026-03-25 09:42"]]),
      originBranchByPath: new Map([["/tmp/repo", "main"]]),
      openAppMetaByPath: new Map([["/tmp/repo/feature-a", { openApp: "codex-app", threadId: null }]]),
    });

    expect(cache).toEqual({
      version: 4,
      worktreesByPath: {
        "/tmp/repo/feature-a": {
          titleEntries: [title],
          mergeStatus: "no-commit",
          lastCommitAt: "2026-03-25 09:42",
          baseRef: "main",
          aheadCount: 0,
          behindCount: 0,
        },
      },
      titlesByPath: {
        "/tmp/repo": [title],
      },
      originLastCommitByPath: {
        "/tmp/repo": "2026-03-25 09:42",
      },
      originBranchByPath: {
        "/tmp/repo": "main",
      },
      openAppMetaByPath: {
        "/tmp/repo/feature-a": { openApp: "codex-app", threadId: null },
      },
    } satisfies WorktreeDeckDisplayCache);
  });

  it("未読込の一覧だけでは保存対象データなしと判定する", () => {
    const cache = buildWorktreeDeckDisplayCache({
      worktrees: [
        buildWorktree({
          repo: "repo",
          path: "/tmp/repo/feature-a",
          branch: "feature-a",
        }),
      ],
      titlesByPath: new Map(),
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      openAppMetaByPath: new Map(),
    });

    expect(hasWorktreeDeckDisplayCacheData(cache)).toBe(false);
  });
});

describe("applyWorktreeDeckDisplayCache", () => {
  it("一致する worktree と origin の表示データを起動直後に復元する", () => {
    const title = buildTitle({
      title: "作業を完了した",
      latestMessage: "done",
      updatedAt: 100,
      status: "done",
      skillUsages: [{ name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" }],
    });
    const restored = applyWorktreeDeckDisplayCache({
      worktrees: [
        buildWorktree({
          repo: "repo",
          path: "/tmp/repo/feature-a",
          branch: "feature-a",
          originPath: "/tmp/repo",
        }),
      ],
      mappings: [buildMapping("/tmp/repo", "repo")],
      cache: {
        version: 4,
        worktreesByPath: {
          "/tmp/repo/feature-a": {
            titleEntries: [title],
            mergeStatus: "no-commit",
            lastCommitAt: "2026-03-25 09:42",
            baseRef: "main",
            aheadCount: 0,
            behindCount: 0,
          },
        },
        titlesByPath: {
          "/tmp/repo": [title],
          "/tmp/other": [buildTitle({ title: "ignored", latestMessage: null, updatedAt: 1 })],
        },
        originLastCommitByPath: {
          "/tmp/repo": "2026-03-25 09:42",
          "/tmp/other": "2026-03-20 00:00",
        },
        originBranchByPath: {
          "/tmp/repo": "main",
          "/tmp/other": "develop",
        },
        openAppMetaByPath: {
          "/tmp/repo": { openApp: "zed", threadId: null },
          "/tmp/repo/feature-a": { openApp: "codex-app", threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b" },
          "/tmp/other": { openApp: "codex-app", threadId: null },
        },
      },
    });

    expect(restored.worktrees).toEqual([
      buildWorktree({
        repo: "repo",
        path: "/tmp/repo/feature-a",
        branch: "feature-a",
        originPath: "/tmp/repo",
        titleEntries: [title],
        mergeStatus: "no-commit",
        lastCommitAt: "2026-03-25 09:42",
        baseRef: "main",
        aheadCount: 0,
        behindCount: 0,
      }),
    ]);
    expect(restored.titlesByPath).toEqual(new Map([["/tmp/repo", [title]]]));
    expect(restored.originLastCommitByPath).toEqual(new Map([["/tmp/repo", "2026-03-25 09:42"]]));
    expect(restored.originBranchByPath).toEqual(new Map([["/tmp/repo", "main"]]));
    expect(restored.openAppMetaByPath).toEqual(
      new Map([
        ["/tmp/repo", { openApp: "zed", threadId: null }],
        ["/tmp/repo/feature-a", { openApp: "codex-app", threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b" }],
      ]),
    );
  });
});

describe("normalizeWorktreeDeckDisplayCache", () => {
  it("不正な形式のキャッシュは復元しない", () => {
    expect(normalizeWorktreeDeckDisplayCache({ version: 0 })).toBeNull();
    expect(normalizeWorktreeDeckDisplayCache({ version: 1, worktreesByPath: [] })).toBeNull();
  });

  it("旧バージョンの表示キャッシュは復元しない", () => {
    expect(
      normalizeWorktreeDeckDisplayCache({
        version: 1,
        worktreesByPath: {},
        titlesByPath: {},
        originLastCommitByPath: {},
        originBranchByPath: {},
        openAppMetaByPath: {},
      }),
    ).toBeNull();
  });

  it("title が文字列でない表示キャッシュは例外にせず復元しない", () => {
    expect(
      normalizeWorktreeDeckDisplayCache({
        version: 4,
        worktreesByPath: {},
        titlesByPath: {
          "/tmp/repo": [
            {
              title: 123,
              latestMessage: null,
              updatedAt: 100,
              status: "working",
              sessionKind: "main",
            },
          ],
        },
        originLastCommitByPath: {},
        originBranchByPath: {},
        openAppMetaByPath: {},
      }),
    ).toBeNull();
  });

  it("セッション種別の追加情報を復元する", () => {
    const title = buildTitle({
      title: "Review subagent",
      latestMessage: null,
      updatedAt: 100,
      sessionKind: "reviewSubagent",
      isWaitingForUser: true,
    });

    const cache = normalizeWorktreeDeckDisplayCache({
      version: 4,
      worktreesByPath: {},
      titlesByPath: {
        "/tmp/repo": [title],
      },
      originLastCommitByPath: {},
      originBranchByPath: {},
      openAppMetaByPath: {},
    });

    expect(cache?.titlesByPath["/tmp/repo"]).toEqual([title]);
  });
});
