import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";

const localStorageGetItemMock = vi.hoisted(() => vi.fn());
const localStorageSetItemMock = vi.hoisted(() => vi.fn());
const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("@raycast/api", () => {
  return {
    LocalStorage: {
      getItem: localStorageGetItemMock,
      setItem: localStorageSetItemMock,
    },
  };
});

vi.mock("node:child_process", () => {
  return {
    execFile: execFileMock,
  };
});

import {
  attachWorktreeTitles,
  findFirstSessionFileByPath,
  findLatestSessionFileByPath,
  listMergeTargetRefs,
  loadAheadBehindCounts,
  loadLatestSessionAnswer,
  loadLatestSessionMessages,
  loadSessionMessages,
  loadTitlesForPaths,
  loadCachedWorktreesBase,
  loadWorktreeMetadata,
  loadWorktreesBase,
  groupWorktrees,
} from "./worktree-store";

const localStorageState = new Map<string, string>();

/**
 * 監視しやすいようにディレクトリ情報を事前構築する
 */
async function buildFixture(): Promise<{
  basePath: string;
  directRepoPath: string;
  nestedRepoPath: string;
  nestedWorktreePath: string;
  nestedGitPath: string;
}> {
  const basePath = await mkdtemp(join(tmpdir(), "worktree-deck-base-"));
  const directRepoPath = join(basePath, "app", "feature-a");
  const directGitPath = join(directRepoPath, ".git");
  await mkdir(directRepoPath, { recursive: true });
  await mkdir(directGitPath, { recursive: true });

  const nestedRepoPath = join(basePath, "repo-b");
  const nestedWorktreePath = join(nestedRepoPath, "feature-x");
  const nestedGitPath = join(nestedWorktreePath, ".git");
  await mkdir(nestedRepoPath, { recursive: true });
  await mkdir(nestedWorktreePath, { recursive: true });
  await mkdir(nestedGitPath, { recursive: true });

  return {
    basePath,
    directRepoPath,
    nestedRepoPath,
    nestedWorktreePath,
    nestedGitPath,
  };
}

/**
 * パス順で比較しやすいように worktree を整列する
 */
function sortWorktreesByPath(worktrees: { path: string }[]): { path: string }[] {
  return [...worktrees].sort((left, right) => left.path.localeCompare(right.path));
}

/**
 * 指定日の sessions ディレクトリにテスト用セッションファイルを作成する
 */
async function createSessionFile(args: { codexHome: string; fileName: string; body: string }): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const sessionsDir = join(args.codexHome, "sessions", year, month, day);
  await mkdir(sessionsDir, { recursive: true });
  const filePath = join(sessionsDir, args.fileName);
  await writeFile(filePath, args.body, "utf8");
  return filePath;
}

/**
 * テスト用 loadTitlesForPaths の引数を組み立てる
 */
function buildLoadTitlesArgs(args: { codexHome: string; paths: string[]; env?: NodeJS.ProcessEnv }): {
  paths: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string | null;
  assetsPath: string;
  packageDir: string;
  packageName: string;
} {
  return {
    paths: args.paths,
    env: { CODEX_HOME: args.codexHome, ...(args.env ?? {}) } as NodeJS.ProcessEnv,
    cwd: process.cwd(),
    homeDir: null,
    assetsPath: process.cwd(),
    packageDir: process.cwd(),
    packageName: "worktree-deck",
  };
}

const readdirSpy = vi.spyOn(fs, "readdir");
const statSpy = vi.spyOn(fs, "stat");

describe("loadWorktreesBase", () => {
  beforeEach(() => {
    localStorageState.clear();
    readdirSpy.mockClear();
    statSpy.mockClear();
    execFileMock.mockReset();
    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(null, "", "");
      }
    });
    localStorageGetItemMock.mockImplementation(async (key: string): Promise<string | null> => {
      return localStorageState.get(key) ?? null;
    });
    localStorageSetItemMock.mockImplementation(async (key: string, value: unknown): Promise<void> => {
      localStorageState.set(key, typeof value === "string" ? value : JSON.stringify(value));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("キャッシュなしでは全件を再帰走査して worktree 一覧を返す", async () => {
    const fixture = await buildFixture();
    try {
      const result = await loadWorktreesBase(fixture.basePath);

      expect(sortWorktreesByPath(result)).toEqual([
        {
          repo: "app",
          branch: "feature-a",
          path: fixture.directRepoPath,
          originPath: undefined,
        },
        {
          repo: "repo-b",
          branch: "feature-x",
          path: fixture.nestedWorktreePath,
          originPath: undefined,
        },
      ]);
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(fixture.basePath);
      expect(calls).toContain(fixture.nestedRepoPath);
      expect(calls).toContain(fixture.nestedWorktreePath);
      expect(calls).not.toContain(fixture.nestedGitPath);
      expect(localStorageSetItemMock).toHaveBeenCalledTimes(1);
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("キャッシュ再利用時は変更なしのリポジトリ配下を再帰走査しない", async () => {
    const fixture = await buildFixture();
    try {
      await loadWorktreesBase(fixture.basePath);
      readdirSpy.mockClear();
      statSpy.mockClear();

      const result = await loadWorktreesBase(fixture.basePath);

      expect(result).toHaveLength(2);
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(fixture.basePath);
      expect(calls).not.toContain(fixture.nestedRepoPath);
      expect(calls).not.toContain(fixture.nestedWorktreePath);
      expect(calls).not.toContain(fixture.nestedGitPath);
      expect(statSpy).toHaveBeenCalled();
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("保存済み cache を検証せず worktree 一覧として返す", async () => {
    const fixture = await buildFixture();
    try {
      await loadWorktreesBase(fixture.basePath);
      readdirSpy.mockClear();
      statSpy.mockClear();

      const result = await loadCachedWorktreesBase(fixture.basePath);

      expect(sortWorktreesByPath(result ?? [])).toEqual([
        {
          repo: "app",
          branch: "feature-a",
          path: fixture.directRepoPath,
          originPath: undefined,
        },
        {
          repo: "repo-b",
          branch: "feature-x",
          path: fixture.nestedWorktreePath,
          originPath: undefined,
        },
      ]);
      expect(readdirSpy).not.toHaveBeenCalled();
      expect(statSpy).not.toHaveBeenCalled();
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("追加されたリポジトリ配下だけを新規に再帰走査する", async () => {
    const fixture = await buildFixture();
    try {
      await loadWorktreesBase(fixture.basePath);
      readdirSpy.mockClear();
      statSpy.mockClear();

      const addedRepoPath = join(fixture.basePath, "repo-c");
      const addedWorktreePath = join(addedRepoPath, "branch-x");
      const addedGitPath = join(addedWorktreePath, ".git");
      await mkdir(addedRepoPath, { recursive: true });
      await mkdir(addedWorktreePath, { recursive: true });
      await mkdir(addedGitPath, { recursive: true });

      const result = await loadWorktreesBase(fixture.basePath);

      expect(sortWorktreesByPath(result)).toEqual(
        [
          {
            repo: "app",
            branch: "feature-a",
            path: fixture.directRepoPath,
            originPath: undefined,
          },
          {
            repo: "repo-b",
            branch: "feature-x",
            path: fixture.nestedWorktreePath,
            originPath: undefined,
          },
          {
            repo: "repo-c",
            branch: "branch-x",
            path: addedWorktreePath,
            originPath: undefined,
          },
        ].sort((left, right) => left.path.localeCompare(right.path)),
      );
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(addedRepoPath);
      expect(calls).toContain(addedWorktreePath);
      expect(calls).not.toContain(fixture.nestedRepoPath);
      expect(calls).not.toContain(fixture.nestedWorktreePath);
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("削除されたリポジトリは次回起動時にキャッシュを更新して除外できる", async () => {
    const fixture = await buildFixture();
    try {
      await loadWorktreesBase(fixture.basePath);
      readdirSpy.mockClear();
      statSpy.mockClear();

      await rm(fixture.nestedRepoPath, { recursive: true, force: true });

      const result = await loadWorktreesBase(fixture.basePath);

      expect(result).toEqual([
        {
          repo: "app",
          branch: "feature-a",
          path: fixture.directRepoPath,
          originPath: undefined,
        },
      ]);
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(fixture.basePath);
      expect(calls).not.toContain(fixture.nestedRepoPath);
      expect(calls).not.toContain(fixture.nestedWorktreePath);
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("トップレベル mtime が同一でもネストした .git 変化を検知して再走査する", async () => {
    const fixture = await buildFixture();
    try {
      const fixedMtime = new Date("2025-01-01T00:00:00.000Z");
      await utimes(fixture.nestedRepoPath, fixedMtime, fixedMtime);
      await loadWorktreesBase(fixture.basePath);
      readdirSpy.mockClear();
      statSpy.mockClear();

      await rm(fixture.nestedGitPath, { recursive: true, force: true });
      await utimes(fixture.nestedRepoPath, fixedMtime, fixedMtime);

      const result = await loadWorktreesBase(fixture.basePath);

      expect(result).toEqual([
        {
          repo: "app",
          branch: "feature-a",
          path: fixture.directRepoPath,
          originPath: undefined,
        },
      ]);
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(fixture.nestedRepoPath);
    } finally {
      await rm(fixture.basePath, { recursive: true, force: true });
    }
  });

  it("直接 worktree の .git が消えたらキャッシュを再利用せず除外する", async () => {
    const basePath = await mkdtemp(join(tmpdir(), "worktree-deck-direct-"));
    const directPath = join(basePath, "solo", "feature-a");
    const directGitPath = join(directPath, ".git");
    try {
      const fixedMtime = new Date("2025-02-01T00:00:00.000Z");
      await mkdir(directPath, { recursive: true });
      await mkdir(directGitPath, { recursive: true });
      await utimes(directPath, fixedMtime, fixedMtime);

      const first = await loadWorktreesBase(basePath);
      expect(first).toEqual([
        {
          repo: "solo",
          branch: "feature-a",
          path: directPath,
          originPath: undefined,
        },
      ]);

      readdirSpy.mockClear();
      statSpy.mockClear();
      await rm(directGitPath, { recursive: true, force: true });
      await utimes(directPath, fixedMtime, fixedMtime);

      const second = await loadWorktreesBase(basePath);
      expect(second).toEqual([]);
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });

  it(".git ファイル内容変更を検知してキャッシュを再利用しない", async () => {
    const basePath = await mkdtemp(join(tmpdir(), "worktree-deck-origin-"));
    const repoPath = join(basePath, "repo-a");
    const worktreePath = join(repoPath, "feature-x");
    const gitFilePath = join(worktreePath, ".git");
    const fixedMtime = new Date("2025-03-01T00:00:00.000Z");
    try {
      await mkdir(worktreePath, { recursive: true });
      await writeFile(gitFilePath, "gitdir: /tmp/git-a\n", "utf8");
      await utimes(worktreePath, fixedMtime, fixedMtime);
      await utimes(gitFilePath, fixedMtime, fixedMtime);
      await loadWorktreesBase(basePath);

      readdirSpy.mockClear();
      statSpy.mockClear();
      await writeFile(gitFilePath, "gitdir: /tmp/git-b\n", "utf8");
      await utimes(worktreePath, fixedMtime, fixedMtime);
      await utimes(gitFilePath, fixedMtime, fixedMtime);
      await loadWorktreesBase(basePath);
      const calls = readdirSpy.mock.calls.map((value) => value[0]);
      expect(calls).toContain(repoPath);
    } finally {
      await rm(basePath, { recursive: true, force: true });
    }
  });
});

describe("loadWorktreeMetadata", () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    vi.clearAllMocks();
  });

  it("remote baseRef が未同期でも同名ローカルブランチへ merge 済みなら synced にする", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "worktree-deck-storage-"));
    process.env.HOME = storageDir;
    execFileMock.mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? args[1] : [];
      const callback = args.at(-1);
      if (typeof callback !== "function") {
        return;
      }
      const succeed = (stdout = "") => callback(null, { stdout, stderr: "" });
      const commandArgs = gitArgs.slice(3);
      if (commandArgs[0] === "status") {
        succeed("# branch.head feature/a\n");
        return;
      }
      if (commandArgs[0] === "merge-base" && commandArgs[1] === "--is-ancestor") {
        const targetRef = commandArgs[3];
        if (targetRef === "origin/main") {
          callback(Object.assign(new Error("not ancestor"), { code: 1 }));
          return;
        }
        if (targetRef === "main") {
          succeed();
          return;
        }
      }
      if (commandArgs[0] === "rev-parse" && commandArgs[1] === "--verify" && commandArgs[3] === "main") {
        succeed();
        return;
      }
      if (commandArgs[0] === "log") {
        succeed("2026-05-03 10:00\n");
        return;
      }
      succeed();
    });

    try {
      const result = await loadWorktreeMetadata(
        [
          {
            repo: "app",
            branch: "feature/a",
            path: "/worktrees/app~_~feature-a",
          },
        ],
        { baseRefByPath: new Map([["/worktrees/app~_~feature-a", "origin/main"]]) },
      );

      expect(result[0]).toMatchObject({
        mergeStatus: "synced",
        baseRef: "origin/main",
      });
      expect(execFileMock).toHaveBeenCalledWith(
        "git",
        ["--no-optional-locks", "-C", "/worktrees/app~_~feature-a", "merge-base", "--is-ancestor", "HEAD", "main"],
        { cwd: "/worktrees/app~_~feature-a" },
        expect.any(Function),
      );
    } finally {
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it("commit 状態が未保存でも現在ブランチに履歴があれば merge 済みを synced にする", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "worktree-deck-storage-"));
    process.env.HOME = storageDir;
    execFileMock.mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? args[1] : [];
      const callback = args.at(-1);
      if (typeof callback !== "function") {
        return;
      }
      const succeed = (stdout = "") => callback(null, { stdout, stderr: "" });
      const commandArgs = gitArgs.slice(3);
      if (commandArgs[0] === "status") {
        succeed("# branch.head feature/a\n");
        return;
      }
      if (commandArgs[0] === "merge-base" && commandArgs[1] === "--is-ancestor") {
        succeed();
        return;
      }
      if (commandArgs[0] === "reflog" && commandArgs[1] === "--format=%H") {
        succeed("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");
        return;
      }
      if (commandArgs[0] === "log") {
        succeed("2026-05-03 10:00\n");
        return;
      }
      succeed();
    });

    try {
      const result = await loadWorktreeMetadata(
        [
          {
            repo: "app",
            branch: "feature/a",
            path: "/worktrees/app~_~feature-a",
          },
        ],
        { baseRefByPath: new Map([["/worktrees/app~_~feature-a", "main"]]) },
      );

      expect(result[0]).toMatchObject({
        mergeStatus: "synced",
        baseRef: "main",
      });
    } finally {
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it("commit 状態が未保存で現在ブランチに履歴がなければ no-commit にする", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "worktree-deck-storage-"));
    process.env.HOME = storageDir;
    execFileMock.mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? args[1] : [];
      const callback = args.at(-1);
      if (typeof callback !== "function") {
        return;
      }
      const succeed = (stdout = "") => callback(null, { stdout, stderr: "" });
      const commandArgs = gitArgs.slice(3);
      if (commandArgs[0] === "status") {
        succeed("# branch.head feature/a\n");
        return;
      }
      if (commandArgs[0] === "merge-base" && commandArgs[1] === "--is-ancestor") {
        succeed();
        return;
      }
      if (commandArgs[0] === "reflog" && commandArgs[1] === "--format=%H") {
        succeed("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");
        return;
      }
      if (commandArgs[0] === "log") {
        succeed("2026-05-03 10:00\n");
        return;
      }
      succeed();
    });

    try {
      const result = await loadWorktreeMetadata(
        [
          {
            repo: "app",
            branch: "feature/a",
            path: "/worktrees/app~_~feature-a",
          },
        ],
        { baseRefByPath: new Map([["/worktrees/app~_~feature-a", "main"]]) },
      );

      expect(result[0]).toMatchObject({
        mergeStatus: "no-commit",
        baseRef: "main",
      });
    } finally {
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it("スラッシュを含むローカル baseRef は同名ローカルブランチ確認を追加しない", async () => {
    const storageDir = await mkdtemp(join(tmpdir(), "worktree-deck-storage-"));
    process.env.HOME = storageDir;
    execFileMock.mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? args[1] : [];
      const callback = args.at(-1);
      if (typeof callback !== "function") {
        return;
      }
      const succeed = (stdout = "") => callback(null, { stdout, stderr: "" });
      const commandArgs = gitArgs.slice(3);
      if (commandArgs[0] === "status") {
        succeed("# branch.head topic/a\n");
        return;
      }
      if (commandArgs[0] === "merge-base" && commandArgs[1] === "--is-ancestor") {
        callback(Object.assign(new Error("not ancestor"), { code: 1 }));
        return;
      }
      if (commandArgs[0] === "log") {
        succeed("2026-05-03 10:00\n");
        return;
      }
      succeed();
    });

    try {
      await loadWorktreeMetadata(
        [
          {
            repo: "app",
            branch: "topic/a",
            path: "/worktrees/app~_~topic-a",
          },
        ],
        { baseRefByPath: new Map([["/worktrees/app~_~topic-a", "feature/foo"]]) },
      );

      expect(execFileMock).not.toHaveBeenCalledWith(
        "git",
        ["--no-optional-locks", "-C", "/worktrees/app~_~topic-a", "rev-parse", "--verify", "--quiet", "foo"],
        { cwd: "/worktrees/app~_~topic-a" },
        expect.any(Function),
      );
    } finally {
      await rm(storageDir, { recursive: true, force: true });
    }
  });
});

describe("worktree git metadata helpers", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ahead/behind は rev-list の左辺を behind、右辺を ahead として返す", async () => {
    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(null, { stdout: "3\t7\n", stderr: "" });
      }
    });

    const result = await loadAheadBehindCounts({ worktreePath: "/worktrees/app", baseRef: "origin/main" });

    expect(result).toEqual({ aheadCount: 7, behindCount: 3 });
    expect(execFileMock).toHaveBeenCalledWith(
      "git",
      ["--no-optional-locks", "-C", "/worktrees/app", "rev-list", "--left-right", "--count", "origin/main...HEAD"],
      { cwd: "/worktrees/app" },
      expect.any(Function),
    );
  });

  it("ahead/behind は空白入力と解釈不能な出力を null にする", async () => {
    const emptyPath = await loadAheadBehindCounts({ worktreePath: " ", baseRef: "origin/main" });
    const emptyBase = await loadAheadBehindCounts({ worktreePath: "/worktrees/app", baseRef: " " });
    execFileMock.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") {
        callback(null, { stdout: "not-a-number 2\n", stderr: "" });
      }
    });

    const invalidOutput = await loadAheadBehindCounts({ worktreePath: "/worktrees/app", baseRef: "origin/main" });

    expect(emptyPath).toBeNull();
    expect(emptyBase).toBeNull();
    expect(invalidOutput).toBeNull();
  });

  it("merge target 候補は現在ブランチ、同名 remote、upstream、origin/HEAD を除外する", async () => {
    execFileMock.mockImplementation((...args: unknown[]) => {
      const gitArgs = Array.isArray(args[1]) ? args[1] : [];
      const callback = args.at(-1);
      if (typeof callback !== "function") {
        return;
      }
      const succeed = (stdout = "") => callback(null, { stdout, stderr: "" });
      const commandArgs = gitArgs.slice(3);
      if (commandArgs[0] === "for-each-ref") {
        succeed(["feature/current", "origin/feature/current", "origin/HEAD", "origin/main", "develop"].join("\n"));
        return;
      }
      if (commandArgs[0] === "symbolic-ref" && commandArgs.at(-1) === "HEAD") {
        succeed("feature/current\n");
        return;
      }
      if (commandArgs[0] === "rev-parse" && commandArgs.at(-1) === "@{u}") {
        succeed("origin/main\n");
        return;
      }
      succeed();
    });

    const result = await listMergeTargetRefs("/worktrees/app");

    expect(result).toEqual(["develop"]);
  });
});

describe("worktree session file helpers", () => {
  it("最終回答は最後に見つかった assistant message を返す", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worktree-deck-session-detail-"));
    const filePath = join(dir, "session-answer.jsonl");
    try {
      await writeFile(
        filePath,
        [
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "First answer" }],
              phase: "final_answer",
            },
          }),
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Latest answer" }],
              phase: "final_answer",
            },
          }),
        ].join("\n"),
        "utf8",
      );

      const result = await loadLatestSessionAnswer({ filePath, homeDir: null });

      expect(result).toBe("Latest answer");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("最新メッセージは role ごとに最後の user と assistant を時系列で返す", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worktree-deck-session-detail-"));
    const filePath = join(dir, "session-latest-messages.jsonl");
    try {
      await writeFile(
        filePath,
        [
          JSON.stringify({
            timestamp: "2026-05-01T00:00:00.000Z",
            type: "event_msg",
            payload: { type: "user_message", message: "First user" },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:01.000Z",
            type: "event_msg",
            payload: { type: "agent_message", message: "Draft assistant" },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:02.000Z",
            type: "response_item",
            payload: { type: "function_call", name: "exec_command", call_id: "call-1" },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:03.000Z",
            type: "event_msg",
            payload: { type: "user_message", message: "Latest user" },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:04.000Z",
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Final assistant" }],
              phase: "final_answer",
            },
          }),
        ].join("\n"),
        "utf8",
      );

      const result = await loadLatestSessionMessages({ filePath, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "Latest user", timestamp: "2026-05-01T00:00:03.000Z" },
        { role: "assistant", text: "Final assistant", timestamp: "2026-05-01T00:00:04.000Z" },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("詳細メッセージは初回 user と environment context を除外し、同内容の event/response 重複を統合する", async () => {
    const dir = await mkdtemp(join(tmpdir(), "worktree-deck-session-detail-"));
    const filePath = join(dir, "session-messages.jsonl");
    try {
      await writeFile(
        filePath,
        [
          JSON.stringify({
            timestamp: "2026-05-01T00:00:00.000Z",
            type: "event_msg",
            payload: {
              type: "user_message",
              message: "Initial title\n<environment_context>\n<cwd>/tmp/app</cwd>\n</environment_context>",
            },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:01.000Z",
            type: "event_msg",
            payload: { type: "user_message", message: "Implement it" },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:02.000Z",
            type: "response_item",
            payload: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Implement it" }],
            },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:03.000Z",
            type: "event_msg",
            payload: { type: "agent_message", message: "Working..." },
          }),
          JSON.stringify({
            timestamp: "2026-05-01T00:00:04.000Z",
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Working..." }],
              phase: "final_answer",
            },
          }),
        ].join("\n"),
        "utf8",
      );

      const result = await loadSessionMessages({ filePath, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "Implement it", timestamp: "2026-05-01T00:00:02.000Z" },
        { role: "assistant", text: "Working...", timestamp: "2026-05-01T00:00:04.000Z" },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("worktree list shaping helpers", () => {
  it("事前取得済みタイトルがある worktree だけに titleEntries を付与する", async () => {
    const worktrees = [
      { repo: "app", branch: "b", path: "/worktrees/app-b" },
      { repo: "app", branch: "a", path: "/worktrees/app-a" },
    ];
    const titleEntries = [
      {
        title: "Title A",
        status: "working" as const,
        latestMessage: null,
        updatedAt: 100,
        sessionKind: "main" as const,
      },
    ];

    const result = await attachWorktreeTitles({
      worktrees,
      titlesByPath: new Map([["/worktrees/app-a", titleEntries]]),
      env: {},
      cwd: process.cwd(),
      homeDir: null,
      assetsPath: process.cwd(),
      packageDir: process.cwd(),
      packageName: "worktree-deck",
    });

    expect(result).toEqual([
      { repo: "app", branch: "b", path: "/worktrees/app-b" },
      { repo: "app", branch: "a", path: "/worktrees/app-a", titleEntries },
    ]);
  });

  it("repo と branch の昇順でグループ化する", () => {
    const result = groupWorktrees([
      { repo: "zeta", branch: "b", path: "/z-b" },
      { repo: "alpha", branch: "c", path: "/a-c" },
      { repo: "alpha", branch: "a", path: "/a-a" },
    ]);

    expect(result).toEqual([
      {
        repo: "alpha",
        items: [
          { repo: "alpha", branch: "a", path: "/a-a" },
          { repo: "alpha", branch: "c", path: "/a-c" },
        ],
      },
      {
        repo: "zeta",
        items: [{ repo: "zeta", branch: "b", path: "/z-b" }],
      },
    ]);
  });
});

describe("loadTitlesForPaths", () => {
  it("通常セッションの status 遷移をタイトル一覧へ反映する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const workingPath = "/tmp/repo-a/working";
    const donePath = "/tmp/repo-a/done";
    const commentaryPath = "/tmp/repo-a/commentary";
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-working.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Working title\n<environment_context>\n<cwd>${workingPath}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-done.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Done title\n<environment_context>\n<cwd>${donePath}</cwd>\n</environment_context>`,
            },
          }),
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Done" }],
              phase: "final_answer",
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-commentary.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Commentary title\n<environment_context>\n<cwd>${commentaryPath}</cwd>\n</environment_context>`,
            },
          }),
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Working" }],
              phase: "commentary",
            },
          }),
        ].join("\n"),
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [workingPath, donePath, commentaryPath],
        }),
      );

      expect(result.get(workingPath)?.[0]).toMatchObject({ title: "Working title", status: "working" });
      expect(result.get(donePath)?.[0]).toMatchObject({ title: "Done title", status: "done" });
      expect(result.get(commentaryPath)?.[0]).toMatchObject({ title: "Commentary title", status: "working" });
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("review セッションの lifecycle は review 継続と完了を区別する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const reviewWorkingPath = "/tmp/repo-a/review-working";
    const reviewDonePath = "/tmp/repo-a/review-done";
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-review-working.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: { type: "entered_review_mode" },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Review working\n<environment_context>\n<cwd>${reviewWorkingPath}</cwd>\n</environment_context>`,
            },
          }),
          JSON.stringify({ type: "response.completed" }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-review-done.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: { type: "entered_review_mode" },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Review done\n<environment_context>\n<cwd>${reviewDonePath}</cwd>\n</environment_context>`,
            },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: { type: "task_complete" },
          }),
        ].join("\n"),
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [reviewWorkingPath, reviewDonePath],
        }),
      );

      expect(result.get(reviewWorkingPath)?.[0]).toMatchObject({
        title: "Review working",
        status: "working",
        sessionKind: "review",
      });
      expect(result.get(reviewDonePath)?.[0]).toMatchObject({
        title: "Review done",
        status: "done",
        sessionKind: "review",
      });
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("古い working セッションは done threshold で完了扱いにする", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/stale-working";
    try {
      const sessionPath = await createSessionFile({
        codexHome,
        fileName: "session-stale-working.jsonl",
        body: [
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Stale working\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      const oldMtime = new Date("2000-01-01T00:00:00.000Z");
      await utimes(sessionPath, oldMtime, oldMtime);

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
          env: { WORKTREE_DECK_DONE_THRESHOLD_DAYS: "1" } as NodeJS.ProcessEnv,
        }),
      );

      expect(result.get(pathA)?.[0]).toMatchObject({ title: "Stale working", status: "done" });
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("sessionKind ごとのタイトル一覧表示対象を固定する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/kind-filter";
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-main.jsonl",
        body: [
          JSON.stringify({
            type: "session_meta",
            payload: { id: "thread-main", source: "cli" },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Main title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-subagent.jsonl",
        body: [
          JSON.stringify({
            type: "session_meta",
            payload: { id: "thread-subagent", source: "subagent" },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-review-subagent.jsonl",
        body: [
          JSON.stringify({
            type: "session_meta",
            payload: { id: "thread-review-subagent", source: { subagent: "review" } },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Review subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-auto-review.jsonl",
        body: [
          JSON.stringify({
            type: "turn_context",
            payload: { model: "codex-auto-review", cwd: pathA },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Auto review title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const titles = result.get(pathA)?.map((entry) => ({ title: entry.title, sessionKind: entry.sessionKind }));
      expect(titles).toEqual(
        expect.arrayContaining([
          { title: "Main title", sessionKind: "main" },
          { title: "Review subagent title", sessionKind: "reviewSubagent" },
        ]),
      );
      expect(titles).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "Subagent title" }),
          expect.objectContaining({ title: "Auto review title" }),
        ]),
      );
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("cwd 抽出元と最長パス優先の紐付けを固定する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const parentPath = "/tmp/repo-a";
    const childPath = "/tmp/repo-a/worktree-a";
    const turnContextPath = "/tmp/repo-b/worktree-b";
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-response-item-cwd.jsonl",
        body: [
          JSON.stringify({
            type: "response_item",
            payload: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `<environment_context>\n<cwd>${childPath}/src</cwd>\n</environment_context>`,
                },
              ],
            },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: "Response item cwd title",
            },
          }),
        ].join("\n"),
      });
      await createSessionFile({
        codexHome,
        fileName: "session-turn-context-cwd.jsonl",
        body: [
          JSON.stringify({
            type: "turn_context",
            payload: { cwd: `${turnContextPath}/nested` },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: {
              type: "user_message",
              message: "Turn context title",
            },
          }),
        ].join("\n"),
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [parentPath, childPath, turnContextPath],
        }),
      );

      expect(result.get(parentPath)).toBeUndefined();
      expect(result.get(childPath)?.[0]?.title).toBe("Response item cwd title");
      expect(result.get(turnContextPath)?.[0]?.title).toBe("Turn context title");
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("最新セッション検索と最初の main セッション検索の対象種別差を固定する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/session-search";
    try {
      const mainSessionPath = await createSessionFile({
        codexHome,
        fileName: "session-main-search.jsonl",
        body: [
          JSON.stringify({
            type: "session_meta",
            payload: { id: "thread-search-main", source: "cli" },
          }),
          JSON.stringify({
            timestamp: "2024-01-01T00:00:00.000Z",
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Main search title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
        ].join("\n"),
      });
      const reviewSessionPath = await createSessionFile({
        codexHome,
        fileName: "session-review-search.jsonl",
        body: [
          JSON.stringify({
            timestamp: "2024-01-02T00:00:00.000Z",
            type: "event_msg",
            payload: {
              type: "user_message",
              message: `Review search title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
            },
          }),
          JSON.stringify({
            type: "event_msg",
            payload: { type: "entered_review_mode" },
          }),
        ].join("\n"),
      });
      await utimes(mainSessionPath, new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-01T00:00:00.000Z"));
      await utimes(reviewSessionPath, new Date("2024-01-02T00:00:00.000Z"), new Date("2024-01-02T00:00:00.000Z"));
      const storeArgs = buildLoadTitlesArgs({
        codexHome,
        paths: [pathA],
        env: { WORKTREE_DECK_SEARCH_DAYS: "10000" } as NodeJS.ProcessEnv,
      });

      const latest = await findLatestSessionFileByPath({ ...storeArgs, path: pathA });
      const first = await findFirstSessionFileByPath({ ...storeArgs, path: pathA });

      expect(latest).toBe(reviewSessionPath);
      expect(first).toBe(mainSessionPath);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("承認待ち function_call のセッションはユーザー指示待ちとして扱う", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const body = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `TitleA\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-1",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-waiting.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      expect(result.get(pathA)?.[0]?.isWaitingForUser).toBe(true);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("session_meta の cwd だけを持つ承認待ちセッションもユーザー指示待ちとして扱う", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const body = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: "thread-review-main",
          source: "cli",
          cwd: pathA,
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "entered_review_mode",
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "Review current changes",
          turn_id: "turn-review",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-meta-cwd-waiting.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const title = result.get(pathA)?.[0];
      expect(title?.title).toBe("Review current changes");
      expect(title?.isWaitingForUser).toBe(true);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("承認待ち function_call が出力済みならユーザー指示待ちとして扱わない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const body = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `TitleA\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-1",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call_output",
          call_id: "call-approval",
          output: "approved",
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-not-waiting.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      expect(result.get(pathA)?.[0]?.isWaitingForUser).toBe(false);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("プラグイン function_call のセッションはユーザー指示待ちとして扱う", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const body = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `TitleA\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-1",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "_add_review_to_pr",
          namespace: "mcp__codex_apps__github",
          call_id: "call-plugin-approval",
          arguments: JSON.stringify({ repo_full_name: "owner/repo", pr_number: 1 }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-plugin-waiting.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      expect(result.get(pathA)?.[0]?.isWaitingForUser).toBe(true);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("プラグイン function_call が出力済みならユーザー指示待ちとして扱わない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const body = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `TitleA\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-1",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "_add_review_to_pr",
          namespace: "mcp__codex_apps__github",
          call_id: "call-plugin-approval",
          arguments: JSON.stringify({ repo_full_name: "owner/repo", pr_number: 1 }),
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call_output",
          call_id: "call-plugin-approval",
          output: '{"success":true}',
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-plugin-not-waiting.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      expect(result.get(pathA)?.[0]?.isWaitingForUser).toBe(false);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("通常サブエージェントの承認待ちは表示対象セッションへ反映しない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const parentBody = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Parent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-parent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Done" }],
          phase: "final_answer",
        },
      }),
    ].join("\n");
    const subagentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          source: "subagent",
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-subagent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-subagent-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-parent.jsonl",
        body: parentBody,
      });
      await createSessionFile({
        codexHome,
        fileName: "session-subagent.jsonl",
        body: subagentBody,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const titles = result.get(pathA);
      expect(titles).toHaveLength(1);
      expect(titles?.[0]?.title).toBe("Parent title");
      expect(titles?.[0]?.isWaitingForUser).toBe(false);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("親スレッドが一致するサブエージェントの承認待ちは親セッションへ反映する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const parentThreadId = "thread-parent-waiting";
    const parentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: parentThreadId,
          source: "cli",
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Parent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-parent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Working" }],
          phase: "commentary",
        },
      }),
    ].join("\n");
    const subagentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: parentThreadId,
              },
            },
          },
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-subagent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-subagent-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-parent-thread.jsonl",
        body: parentBody,
      });
      await createSessionFile({
        codexHome,
        fileName: "session-subagent-thread.jsonl",
        body: subagentBody,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const titles = result.get(pathA);
      expect(titles).toHaveLength(1);
      expect(titles?.[0]?.title).toBe("Parent title");
      expect(titles?.[0]?.isWaitingForUser).toBe(true);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("親スレッドが一致しないサブエージェントの承認待ちは親セッションへ反映しない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const parentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: "thread-parent-visible",
          source: "cli",
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Parent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-parent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Working" }],
          phase: "commentary",
        },
      }),
    ].join("\n");
    const subagentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: "thread-other-parent",
              },
            },
          },
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-subagent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-subagent-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-parent-mismatch.jsonl",
        body: parentBody,
      });
      await createSessionFile({
        codexHome,
        fileName: "session-subagent-mismatch.jsonl",
        body: subagentBody,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const titles = result.get(pathA);
      expect(titles).toHaveLength(1);
      expect(titles?.[0]?.title).toBe("Parent title");
      expect(titles?.[0]?.isWaitingForUser).toBe(false);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("孫サブエージェントの承認待ちは祖先の親セッションへ反映する", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const parentThreadId = "thread-parent-waiting";
    const childThreadId = "thread-child-waiting";
    const grandchildThreadId = "thread-grandchild-waiting";
    const parentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: parentThreadId,
          source: "cli",
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Parent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-parent",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Working" }],
          phase: "commentary",
        },
      }),
    ].join("\n");
    const childSubagentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: childThreadId,
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: parentThreadId,
              },
            },
          },
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Child subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-child",
        },
      }),
    ].join("\n");
    const grandchildSubagentBody = [
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: grandchildThreadId,
          source: {
            subagent: {
              thread_spawn: {
                parent_thread_id: childThreadId,
              },
            },
          },
        },
      }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Grandchild subagent title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-grandchild",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-grandchild-approval",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-parent-grandchild-waiting.jsonl",
        body: parentBody,
      });
      await createSessionFile({
        codexHome,
        fileName: "session-child-subagent-grandchild-waiting.jsonl",
        body: childSubagentBody,
      });
      await createSessionFile({
        codexHome,
        fileName: "session-grandchild-subagent-waiting.jsonl",
        body: grandchildSubagentBody,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );

      const titles = result.get(pathA);
      expect(titles).toHaveLength(1);
      expect(titles?.[0]?.title).toBe("Parent title");
      expect(titles?.[0]?.isWaitingForUser).toBe(true);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("session_meta の cwd がある場合は履歴内 user message の cwd で別 worktree に紐付けない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const pathB = "/tmp/repo-b/worktree-b";
    const body = [
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Forked history title\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
          turn_id: "turn-history",
        },
      }),
      JSON.stringify({
        type: "session_meta",
        payload: {
          id: "thread-current-worktree",
          cwd: pathB,
          source: "cli",
        },
      }),
      JSON.stringify({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Done" }],
          phase: "final_answer",
        },
      }),
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-meta-cwd-ignores-history-cwd.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA, pathB],
        }),
      );

      expect(result.get(pathA)).toBeUndefined();
      expect(result.get(pathB)?.[0]?.title).toBe("Forked history title");
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("対象パス追加時も未更新セッションは既存キャッシュを再利用できる", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/worktree-a";
    const pathB = "/tmp/repo-b/worktree-b";
    const validBody = `${JSON.stringify({
      type: "event_msg",
      payload: {
        type: "user_message",
        message: `TitleA\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
        turn_id: "turn-1",
      },
    })}\n`;
    try {
      const filePath = await createSessionFile({
        codexHome,
        fileName: "session-a.jsonl",
        body: validBody,
      });
      const fixedMtime = new Date("2025-01-01T00:00:00.000Z");
      await utimes(filePath, fixedMtime, fixedMtime);

      const first = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA],
        }),
      );
      expect(first.get(pathA)?.[0]?.title).toBe("TitleA");
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      localStorageSetItemMock.mockClear();

      const brokenBody = `not-json-${"x".repeat(Math.max(0, validBody.length - "not-json-".length))}`;
      expect(Buffer.byteLength(brokenBody)).toBe(Buffer.byteLength(validBody));
      await writeFile(filePath, brokenBody, "utf8");
      await utimes(filePath, fixedMtime, fixedMtime);

      const second = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA, pathB],
        }),
      );
      expect(second.get(pathA)?.[0]?.title).toBe("TitleA");
      expect(localStorageSetItemMock).not.toHaveBeenCalled();
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });

  it("head/tail 解析で末尾欠損がなければ working でも全量解析しない", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "worktree-deck-codex-home-"));
    const pathA = "/tmp/repo-a/tail-complete-a";
    const pathB = "/tmp/repo-b/tail-complete-b";
    const tailReadBytes = 256 * 1024;
    const headLine = JSON.stringify({
      type: "event_msg",
      payload: {
        type: "user_message",
        message: `Tail complete\n<environment_context>\n<cwd>${pathA}</cwd>\n</environment_context>`,
      },
    });
    const middleLine = JSON.stringify({
      type: "session_meta",
      payload: {
        cwd: pathB,
      },
    });
    const tailLine = JSON.stringify({
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "Working" }],
        phase: "commentary",
      },
    });
    const tailLineWithBreak = `${tailLine}\n`;
    const tailPaddingLength = tailReadBytes - Buffer.byteLength(tailLineWithBreak, "utf8");
    const body = [
      headLine,
      "x".repeat(300 * 1024),
      middleLine,
      `${tailLineWithBreak}${" ".repeat(tailPaddingLength)}`,
    ].join("\n");
    try {
      await createSessionFile({
        codexHome,
        fileName: "session-tail-complete.jsonl",
        body,
      });

      const result = await loadTitlesForPaths(
        buildLoadTitlesArgs({
          codexHome,
          paths: [pathA, pathB],
        }),
      );

      expect(result.get(pathA)?.[0]).toMatchObject({ title: "Tail complete", status: "working" });
      expect(result.get(pathB)).toBeUndefined();
    } finally {
      await rm(codexHome, { recursive: true, force: true });
    }
  });
});
