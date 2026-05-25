import { describe, expect, it } from "vitest";

import type { Worktree } from "../application/worktree.entity";
import type { WorktreeTitle } from "../application/worktree-title.entity";
import {
  buildDetailMarkdown,
  buildSectionsWithMappings,
  buildSortedSectionEntries,
  formatBranchTitle,
  parseDisplayMode,
  resolveUnresolvedCodexThreadPaths,
  toggleDisplayMode,
  type WorktreeDeckDisplayMode,
} from "./worktree-deck-view-model";

/**
 * テスト用のセッションを作成する
 */
function buildTitleEntry(args: {
  title: string;
  latestMessage: string | null;
  updatedAt: number;
  startedAt?: number | null;
  status?: "working" | "done" | null;
  sessionKind?: WorktreeTitle["sessionKind"];
  isWaitingForUser?: boolean;
  skillUsages?: WorktreeTitle["skillUsages"];
}): WorktreeTitle {
  return {
    title: args.title,
    latestMessage: args.latestMessage,
    updatedAt: args.updatedAt,
    startedAt: args.startedAt,
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
}): Worktree {
  return {
    repo: args.repo,
    path: args.path,
    branch: args.branch,
    originPath: args.originPath,
    titleEntries: args.titleEntries,
  };
}

describe("worktree-deck-view-model", () => {
  it("表示モードは Show All と Worktrees Only を相互に切り替える", () => {
    expect(toggleDisplayMode("show-all")).toBe("worktrees-only");
    expect(toggleDisplayMode("worktrees-only")).toBe("show-all");
  });

  it("未知の表示モード文字列は show-all に正規化する", () => {
    expect(parseDisplayMode("invalid")).toBe("show-all");
  });

  it("いずれかのセッションがユーザー指示待ちならブランチ名の先頭に警告を付ける", () => {
    const title = formatBranchTitle({
      branch: "feature-a",
      titles: [buildTitleEntry({ title: "waiting", latestMessage: null, updatedAt: 100, isWaitingForUser: true })],
    });

    expect(title).toBe("⚠️ feature-a");
  });

  it("古いセッションだけがユーザー指示待ちでもブランチ名に警告を付ける", () => {
    const title = formatBranchTitle({
      branch: "feature-a",
      titles: [
        buildTitleEntry({ title: "latest", latestMessage: null, updatedAt: 200, isWaitingForUser: false }),
        buildTitleEntry({ title: "old", latestMessage: null, updatedAt: 100, isWaitingForUser: true }),
      ],
    });

    expect(title).toBe("⚠️ feature-a");
  });

  it("トップ詳細をキーバリュー表で表示する", () => {
    const markdown = buildDetailMarkdown({
      title: "feature-a",
      isTitlesLoading: false,
      mergeStatus: "dirty",
      baseRef: "main",
      aheadCount: 2,
      behindCount: 1,
      titles: [
        buildTitleEntry({
          title: "Implement feature",
          latestMessage: "Done\n\n- changed a | b\n- verified",
          updatedAt: 100,
          skillUsages: [
            { name: "github:yeet", timestamp: "2026-05-03T10:00:00.000Z" },
            { name: "GitHub Yeet", timestamp: "2026-05-03T10:01:00.000Z" },
            { name: "imagegen", timestamp: null },
          ],
        }),
      ],
    });

    expect(markdown).toBe(
      [
        "| 📝 | Implement feature |",
        "| --- | --- |",
        "| 🌿 | 🌿 main (+2 -1)  ⚠️ dirty |",
        "| 🧰 | `github:yeet` ×2, `imagegen` |",
        "",
        "Done",
        "",
        "- changed a | b",
        "- verified",
      ].join("\n"),
    );
  });

  it("1行の最新メッセージも表の外に表示する", () => {
    const markdown = buildDetailMarkdown({
      title: "feature-a",
      isTitlesLoading: false,
      titles: [buildTitleEntry({ title: "Implement feature", latestMessage: "Done", updatedAt: 100 })],
    });

    expect(markdown).toBe(
      ["| 📝 | Implement feature |", "| --- | --- |", "| 🌿 | No git status |", "| 🧰 | None |", "", "Done"].join("\n"),
    );
  });

  it("複数通常セッションがある場合も詳細タイトルは初回タイトルを維持する", () => {
    const markdown = buildDetailMarkdown({
      title: "feature-a",
      isTitlesLoading: false,
      titles: [
        buildTitleEntry({
          title: "Second session title",
          latestMessage: "New session is running",
          updatedAt: 300,
          startedAt: 200,
          skillUsages: [{ name: "imagegen", timestamp: "2026-05-03T10:00:00.000Z" }],
        }),
        buildTitleEntry({
          title: "First session title",
          latestMessage: "Old message",
          updatedAt: 150,
          startedAt: 100,
          skillUsages: [{ name: "github:yeet", timestamp: "2026-05-03T09:00:00.000Z" }],
        }),
      ],
    });

    expect(markdown).toBe(
      [
        "| 📝 | First session title |",
        "| --- | --- |",
        "| 🌿 | No git status |",
        "| 🧰 | `imagegen` |",
        "",
        "New session is running",
      ].join("\n"),
    );
  });

  it("Worktrees Only モードでは repo ごとのセクションを返して origin だけの mapping は含めない", () => {
    const mode: WorktreeDeckDisplayMode = "worktrees-only";
    const sections = buildSectionsWithMappings(
      [
        buildWorktree({ repo: "repo-a", path: "/tmp/repo-a~_~feature-a", branch: "feature-a" }),
        buildWorktree({ repo: "repo-b", path: "/tmp/repo-b~_~feature-b", branch: "feature-b" }),
      ],
      [{ repoRoot: "/repos/repo-c", mapValue: "repo-c" }],
      mode,
    );

    expect(sections.map((section) => section.repo)).toEqual(["repo-a", "repo-b"]);
  });

  it("repo セクションは origin を含む最新 session 更新時刻の降順で並べる", () => {
    const sections = buildSectionsWithMappings(
      [
        buildWorktree({
          repo: "repo-worktree-new",
          path: "/tmp/repo-worktree-new~_~feature-a",
          branch: "feature-a",
          originPath: "/repos/repo-worktree-new",
          titleEntries: [buildTitleEntry({ title: "worktree", latestMessage: "w", status: "working", updatedAt: 300 })],
        }),
        buildWorktree({
          repo: "repo-origin-new",
          path: "/tmp/repo-origin-new~_~feature-b",
          branch: "feature-b",
          originPath: "/repos/repo-origin-new",
          titleEntries: [buildTitleEntry({ title: "worktree", latestMessage: "w", status: "working", updatedAt: 100 })],
        }),
        buildWorktree({
          repo: "repo-no-session",
          path: "/tmp/repo-no-session~_~feature-c",
          branch: "feature-c",
          originPath: "/repos/repo-no-session",
        }),
      ],
      [
        { repoRoot: "/repos/repo-worktree-new", mapValue: "repo-worktree-new" },
        { repoRoot: "/repos/repo-origin-new", mapValue: "repo-origin-new" },
        { repoRoot: "/repos/repo-no-session", mapValue: "repo-no-session" },
      ],
      "show-all",
      {
        titlesByPath: new Map([
          [
            "/repos/repo-origin-new",
            [buildTitleEntry({ title: "origin", latestMessage: "o", status: "done", updatedAt: 900 })],
          ],
        ]),
      },
    );

    expect(sections.map((section) => section.repo)).toEqual([
      "repo-origin-new",
      "repo-worktree-new",
      "repo-no-session",
    ]);
  });

  it("repo セクション順では同一 repo 内の worktree status を無視して最新更新時刻を採用する", () => {
    const sections = buildSectionsWithMappings(
      [
        buildWorktree({
          repo: "repo-mixed-status",
          path: "/tmp/repo-mixed-status~_~done-old",
          branch: "done-old",
          originPath: "/repos/repo-mixed-status",
          titleEntries: [buildTitleEntry({ title: "done-old", latestMessage: "d", status: "done", updatedAt: 100 })],
        }),
        buildWorktree({
          repo: "repo-mixed-status",
          path: "/tmp/repo-mixed-status~_~working-new",
          branch: "working-new",
          originPath: "/repos/repo-mixed-status",
          titleEntries: [
            buildTitleEntry({ title: "working-new", latestMessage: "w", status: "working", updatedAt: 900 }),
          ],
        }),
        buildWorktree({
          repo: "repo-middle",
          path: "/tmp/repo-middle~_~feature-a",
          branch: "feature-a",
          originPath: "/repos/repo-middle",
          titleEntries: [buildTitleEntry({ title: "feature-a", latestMessage: "m", status: "done", updatedAt: 500 })],
        }),
      ],
      [
        { repoRoot: "/repos/repo-mixed-status", mapValue: "repo-mixed-status" },
        { repoRoot: "/repos/repo-middle", mapValue: "repo-middle" },
      ],
      "show-all",
      {
        titlesByPath: new Map(),
      },
    );

    expect(sections.map((section) => section.repo)).toEqual(["repo-mixed-status", "repo-middle"]);
  });

  it("session を持たない repo セクションは最後尾に並べる", () => {
    const sections = buildSectionsWithMappings(
      [
        buildWorktree({
          repo: "repo-with-session",
          path: "/tmp/repo-with-session~_~feature-a",
          branch: "feature-a",
          originPath: "/repos/repo-with-session",
          titleEntries: [buildTitleEntry({ title: "worktree", latestMessage: "w", status: "done", updatedAt: 50 })],
        }),
      ],
      [
        { repoRoot: "/repos/repo-with-session", mapValue: "repo-with-session" },
        { repoRoot: "/repos/repo-without-session", mapValue: "repo-without-session" },
      ],
      "show-all",
      {
        titlesByPath: new Map(),
      },
    );

    expect(sections.map((section) => section.repo)).toEqual(["repo-with-session", "repo-without-session"]);
  });

  it("pinned section order があると session 更新時刻では並び替えない", () => {
    const sections = buildSectionsWithMappings(
      [
        buildWorktree({
          repo: "repo-old",
          path: "/tmp/repo-old~_~feature-a",
          branch: "feature-a",
          titleEntries: [buildTitleEntry({ title: "old", latestMessage: "old", updatedAt: 100 })],
        }),
        buildWorktree({
          repo: "repo-new",
          path: "/tmp/repo-new~_~feature-a",
          branch: "feature-a",
          titleEntries: [buildTitleEntry({ title: "new", latestMessage: "new", updatedAt: 900 })],
        }),
      ],
      [],
      "show-all",
      {
        sectionOrder: new Map([
          ["repo-old", 0],
          ["repo-new", 1],
        ]),
      },
    );

    expect(sections.map((section) => section.repo)).toEqual(["repo-old", "repo-new"]);
  });

  it("pinned section entry order があると実データ更新後も既存 entry の順番を維持する", () => {
    const entries = buildSortedSectionEntries({
      items: [
        buildWorktree({
          repo: "repo-a",
          path: "/tmp/repo-a~_~feature-old",
          branch: "feature-old",
          titleEntries: [buildTitleEntry({ title: "old", latestMessage: "old", status: "done", updatedAt: 100 })],
        }),
        buildWorktree({
          repo: "repo-a",
          path: "/tmp/repo-a~_~feature-new",
          branch: "feature-new",
          titleEntries: [buildTitleEntry({ title: "new", latestMessage: "new", status: "working", updatedAt: 900 })],
        }),
      ],
      titlesByPath: new Map(),
      mappedOrigins: [],
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      includeOrigin: true,
      entryOrder: new Map([
        ["worktree:/tmp/repo-a~_~feature-old", 0],
        ["worktree:/tmp/repo-a~_~feature-new", 1],
      ]),
    });

    expect(entries.map((entry) => (entry.kind === "worktree" ? entry.item.branch : entry.originPath))).toEqual([
      "feature-old",
      "feature-new",
    ]);
  });

  it("includeOrigin=false のとき origin エントリを含めない", () => {
    const entries = buildSortedSectionEntries({
      items: [
        buildWorktree({
          repo: "repo-a",
          path: "/tmp/repo-a~_~feature-a",
          branch: "feature-a",
          originPath: "/repos/repo-a",
          titleEntries: [buildTitleEntry({ title: "done", latestMessage: "done", status: "done", updatedAt: 100 })],
        }),
      ],
      titlesByPath: new Map([
        [
          "/repos/repo-a",
          [buildTitleEntry({ title: "origin", latestMessage: "origin", status: "working", updatedAt: 200 })],
        ],
      ]),
      mappedOrigins: ["/repos/repo-a"],
      originLastCommitByPath: new Map(),
      originBranchByPath: new Map(),
      includeOrigin: false,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.kind).toBe("worktree");
  });
});

describe("resolveUnresolvedCodexThreadPaths", () => {
  it("Codex App で thread id が未解決のパスだけ返す", () => {
    const actual = resolveUnresolvedCodexThreadPaths(
      new Map([
        ["/worktrees/a", { openApp: "codex-app", threadId: null }],
        ["/worktrees/b", { openApp: "codex-app", threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b" }],
        ["/worktrees/c", { openApp: "zed", threadId: null }],
      ]),
    );

    expect(actual).toEqual(["/worktrees/a"]);
  });
});
