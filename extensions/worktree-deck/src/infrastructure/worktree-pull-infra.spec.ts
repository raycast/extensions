import { afterEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

/**
 * execFile の戻り値を順番に返すモックを作る
 */
function mockExecFileSequence(responses: Array<{ stdout?: string; stderr?: string; error?: Error | null }>): void {
  execFileMock.mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1];
    if (typeof callback !== "function") {
      throw new Error("Callback is required.");
    }
    const next = responses.shift();
    if (!next) {
      throw new Error("Unexpected execFile call.");
    }
    if (next.error) {
      callback(next.error);
      return;
    }
    callback(null, next.stdout ?? "", next.stderr ?? "");
  });
}

/**
 * 対象モジュールを読み込む
 */
async function loadModule() {
  return await import("./worktree-pull-infra");
}

afterEach(() => {
  execFileMock.mockReset();
  vi.resetModules();
});

describe("buildWorktreePullPlan", () => {
  it("git が見つからない場合は branch なし扱いにせず案内エラーで失敗する", async () => {
    const error = Object.assign(new Error("spawn git ENOENT"), {
      code: "ENOENT",
      syscall: "spawn git",
      path: "git",
    });
    mockExecFileSequence([{ error }]);
    const { buildWorktreePullPlan } = await loadModule();

    await expect(buildWorktreePullPlan({ worktreePath: "/repo/path", expectedBranch: "feature" })).rejects.toThrow(
      "Git is required to manage worktrees. Install Git and ensure it is available in PATH.",
    );
  });

  it("現在のブランチが一致しなければエラー", async () => {
    mockExecFileSequence([{ stdout: "feature\n" }]);
    const { buildWorktreePullPlan } = await loadModule();

    await expect(buildWorktreePullPlan({ worktreePath: "/repo/path", expectedBranch: "main" })).rejects.toThrow(
      "Current branch does not match selected branch.",
    );
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it("追跡ブランチが無い場合はエラー", async () => {
    mockExecFileSequence([{ stdout: "feature\n" }, { error: new Error("fatal: no upstream configured") }]);
    const { buildWorktreePullPlan } = await loadModule();

    await expect(buildWorktreePullPlan({ worktreePath: "/repo/path", expectedBranch: "feature" })).rejects.toThrow(
      "Upstream branch is not configured.",
    );
  });

  it("現在ブランチと追跡参照を返す", async () => {
    mockExecFileSequence([{ stdout: "feature\n" }, { stdout: "origin/feature\n" }]);
    const { buildWorktreePullPlan } = await loadModule();

    const plan = await buildWorktreePullPlan({ worktreePath: "/repo/path", expectedBranch: "feature" });

    expect(plan).toEqual({
      worktreePath: "/repo/path",
      branch: "feature",
      upstreamRef: "origin/feature",
    });
  });
});

describe("pullWorktree", () => {
  it("git が見つからない場合は pull 用の案内エラーで失敗する", async () => {
    const error = Object.assign(new Error("spawn git ENOENT"), {
      code: "ENOENT",
      syscall: "spawn git",
      path: "git",
    });
    mockExecFileSequence([{ error }]);
    const { pullWorktree } = await loadModule();

    await expect(
      pullWorktree({
        worktreePath: "/repo/path",
        branch: "feature",
        upstreamRef: "origin/feature",
      }),
    ).rejects.toThrow("Git is required to manage worktrees. Install Git and ensure it is available in PATH.");
  });

  it("git pull を実行する", async () => {
    mockExecFileSequence([{ stdout: "Already up to date.\n" }]);
    const { pullWorktree } = await loadModule();

    const result = await pullWorktree({
      worktreePath: "/repo/path",
      branch: "feature",
      upstreamRef: "origin/feature",
    });

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0]?.[0]).toBe("git");
    expect(execFileMock.mock.calls[0]?.[1]).toEqual(["-C", "/repo/path", "pull"]);
    expect(result).toEqual({ branch: "feature", upstreamRef: "origin/feature" });
  });
});
