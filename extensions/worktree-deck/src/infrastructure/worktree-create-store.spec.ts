import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const childProcessMocks = vi.hoisted(() => {
  const execFile = vi.fn();
  const spawn = vi.fn(() => {
    const child = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      unref: vi.fn(),
      on: vi.fn((event: string, callback: (code: number) => void) => {
        if (event === "close") {
          process.nextTick(() => callback(0));
        }
        return child;
      }),
    };
    return child;
  });
  return { execFile, spawn };
});

vi.mock("node:child_process", () => {
  return {
    execFile: childProcessMocks.execFile,
    spawn: childProcessMocks.spawn,
  };
});

import { createWorktree, resolveRepositoryMapPaths } from "./worktree-create-store";

/**
 * テスト用の worktree 作成先を準備する
 */
async function createWorktreeFixture(): Promise<{ rootDir: string; basePath: string }> {
  const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-store-"));
  const basePath = join(rootDir, "worktrees");
  await mkdir(basePath, { recursive: true });
  vi.stubEnv("GIT_WORKTREE_PATH", basePath);
  vi.stubEnv("HOME", rootDir);
  return { rootDir, basePath };
}

describe("createWorktree", () => {
  const createdRoots: string[] = [];

  afterEach(async () => {
    childProcessMocks.execFile.mockReset();
    childProcessMocks.spawn.mockClear();
    vi.unstubAllEnvs();
    await Promise.all(createdRoots.map((path) => rm(path, { recursive: true, force: true })));
    createdRoots.length = 0;
  });

  it("repository map paths は env ファイルが無くても script path を返す", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "worktree-create-store-"));
    createdRoots.push(rootDir);
    const assetsPath = join(rootDir, "assets");
    const scriptPath = join(assetsPath, "git_worktree_wrap.sh");
    await mkdir(assetsPath, { recursive: true });
    await writeFile(scriptPath, "#!/usr/bin/env bash\n", "utf8");

    const result = await resolveRepositoryMapPaths({
      env: {},
      homeDir: rootDir,
      assetsPath,
      packageDir: rootDir,
      packageName: "worktree-deck",
    });

    expect(result).toEqual({ scriptPath });
  });

  it("新規ブランチなら git worktree add -b を呼ぶ", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        if (command === "git" && args.includes("show-ref")) {
          callback(new Error("missing"), "", "missing");
          return;
        }
        callback(null, "", "");
      },
    );

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/new",
      startPoint: "main",
      scriptPath: "",
      mapValue: "app",
    });

    expect(result.createdPath).toBe(join(fixture.basePath, "app", "feature", "new"));
    expect(childProcessMocks.execFile).toHaveBeenCalledWith(
      "git",
      [
        "-C",
        "/repos/app",
        "worktree",
        "add",
        "-b",
        "feature/new",
        join(fixture.basePath, "app", "feature", "new"),
        "main",
      ],
      { cwd: "/repos/app" },
      expect.any(Function),
    );
  });

  it("git が見つからない場合は branch なし扱いにせず案内エラーで失敗する", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (_command: string, _args: string[], _options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        const error = Object.assign(new Error("spawn git ENOENT"), {
          code: "ENOENT",
          syscall: "spawn git",
          path: "git",
        });
        callback(error, "", "");
      },
    );

    await expect(
      createWorktree({
        repoRoot: "/repos/app",
        branch: "feature/missing-git",
        startPoint: "main",
        scriptPath: "",
        mapValue: "app",
      }),
    ).rejects.toThrow("Git is required to manage worktrees. Install Git and ensure it is available in PATH.");
    expect(childProcessMocks.spawn).not.toHaveBeenCalled();
  });

  it("branch 名の特殊文字列と underscore を壊さず nested path を作る", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        if (command === "git" && args.includes("show-ref")) {
          callback(new Error("missing"), "", "missing");
          return;
        }
        callback(null, "", "");
      },
    );

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/add__name_with_under_score",
      startPoint: "main",
      scriptPath: "",
      mapValue: "app",
    });

    expect(result.createdPath).toBe(join(fixture.basePath, "app", "feature", "add__name_with_under_score"));
  });

  it("worktree 作成後に未追跡ファイルコピーを detached worker へ逃がす", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        if (command === "git" && args.includes("show-ref")) {
          callback(new Error("missing"), "", "missing");
          return;
        }
        callback(null, "", "");
      },
    );

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/copy",
      startPoint: "main",
      scriptPath: join(fixture.rootDir, "assets", "git_worktree_wrap.sh"),
      mapValue: "app",
    });

    const destination = join(fixture.basePath, "app", "feature", "copy");
    expect(result.createdPath).toBe(destination);
    expect(childProcessMocks.spawn).toHaveBeenCalledWith(
      process.execPath,
      [join(fixture.rootDir, "assets", "copy_untracked_worker.js"), expect.stringContaining(`"repoRoot":"/repos/app"`)],
      expect.objectContaining({
        detached: true,
        stdio: "ignore",
      }),
    );
    expect(childProcessMocks.spawn.mock.results[0]?.value.unref).toHaveBeenCalled();
  });

  it("未追跡ファイルコピー worker の起動に失敗しても worktree 作成結果を返す", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        if (command === "git" && args.includes("show-ref")) {
          callback(new Error("missing"), "", "missing");
          return;
        }
        callback(null, "", "");
      },
    );
    childProcessMocks.spawn.mockImplementationOnce(() => {
      throw new Error("spawn failed");
    });

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/spawn-failure",
      startPoint: "main",
      scriptPath: join(fixture.rootDir, "assets", "git_worktree_wrap.sh"),
      mapValue: "app",
    });

    expect(result.createdPath).toBe(join(fixture.basePath, "app", "feature", "spawn-failure"));
    expect(result.stderr).toContain("Failed to start untracked files copy job:");
  });

  it("既存ブランチなら git worktree add を呼ぶ", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        callback(null, "", "");
      },
    );

    await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/existing",
      startPoint: "main",
      scriptPath: "",
      mapValue: "app",
    });

    expect(childProcessMocks.execFile).toHaveBeenCalledWith(
      "git",
      ["-C", "/repos/app", "worktree", "add", join(fixture.basePath, "app", "feature", "existing"), "feature/existing"],
      { cwd: "/repos/app" },
      expect.any(Function),
    );
  });

  it("作成先が既に存在する場合は英語エラーで失敗する", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    const destination = join(fixture.basePath, "app", "feature", "exists");
    await mkdir(destination, { recursive: true });

    await expect(
      createWorktree({
        repoRoot: "/repos/app",
        branch: "feature/exists",
        startPoint: "main",
        scriptPath: "",
        mapValue: "app",
      }),
    ).rejects.toThrow("Worktree destination already exists.");
    expect(existsSync(destination)).toBe(true);
    expect(childProcessMocks.execFile).not.toHaveBeenCalled();
    expect(childProcessMocks.spawn).not.toHaveBeenCalled();
  });

  it("restore で作成先が一致する既存 worktree なら採用する", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    const destination = join(fixture.basePath, "app", "feature", "restored");
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, ".git"), "gitdir: /repos/app/.git/worktrees/app\n", "utf8");
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function" || command !== "git") {
          return;
        }
        if (args.includes("symbolic-ref")) {
          callback(null, { stdout: "feature/restored\n", stderr: "" });
          return;
        }
        if (args.includes("rev-parse") && args.includes("--git-common-dir")) {
          callback(null, { stdout: "/repos/app/.git\n", stderr: "" });
          return;
        }
        callback(new Error("unexpected git call"), "", "unexpected git call");
      },
    );

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/restored",
      startPoint: "main",
      scriptPath: "",
      mapValue: "app",
      allowExistingWorktree: true,
    });

    expect(result).toEqual({
      createdPath: destination,
      stdout: `Existing worktree: ${destination}\n`,
      stderr: "",
      reusedExisting: true,
    });
    expect(childProcessMocks.spawn).not.toHaveBeenCalled();
  });

  it("restore で作成先が別ブランチなら削除履歴を採用しない", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    const destination = join(fixture.basePath, "app", "feature", "restored");
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, ".git"), "gitdir: /repos/app/.git/worktrees/app\n", "utf8");
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function" || command !== "git") {
          return;
        }
        if (args.includes("symbolic-ref")) {
          callback(null, { stdout: "feature/other\n", stderr: "" });
          return;
        }
        if (args.includes("rev-parse") && args.includes("--git-common-dir")) {
          callback(null, { stdout: "/repos/app/.git\n", stderr: "" });
          return;
        }
        callback(new Error("unexpected git call"), "", "unexpected git call");
      },
    );

    await expect(
      createWorktree({
        repoRoot: "/repos/app",
        branch: "feature/restored",
        startPoint: "main",
        scriptPath: "",
        mapValue: "app",
        allowExistingWorktree: true,
      }),
    ).rejects.toThrow(
      "Worktree destination already exists but does not match the deleted worktree. Destination uses a different branch.",
    );
    expect(childProcessMocks.spawn).not.toHaveBeenCalled();
  });

  it("GIT_WORKTREE_PATH の home path を展開して作成先を組み立てる", async () => {
    const fixture = await createWorktreeFixture();
    createdRoots.push(fixture.rootDir);
    vi.stubEnv("GIT_WORKTREE_PATH", "~/.worktree-deck/worktrees");
    vi.stubEnv("HOME", fixture.rootDir);
    childProcessMocks.execFile.mockImplementation(
      (command: string, args: string[], options: unknown, callback: unknown) => {
        if (typeof callback !== "function") {
          return;
        }
        if (command === "git" && args.includes("show-ref")) {
          callback(new Error("missing"), "", "missing");
          return;
        }
        callback(null, "", "");
      },
    );

    const result = await createWorktree({
      repoRoot: "/repos/app",
      branch: "feature/home-path",
      startPoint: "main",
      scriptPath: "",
      mapValue: "app",
    });

    expect(result.createdPath).toBe(
      join(fixture.rootDir, ".worktree-deck", "worktrees", "app", "feature", "home-path"),
    );
  });
});
