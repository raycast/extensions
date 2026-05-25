import { describe, expect, it, vi } from "vitest";

import { createWorktreeRenameDependencies, createWorktreeRenameInfra } from "./worktree-rename-dependencies";

describe("createWorktreeRenameDependencies", () => {
  it("ローカルブランチ名変更コマンドを組み立てる", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const dependencies = createWorktreeRenameDependencies({ runGit });

    await dependencies.renameLocalBranch({
      repoRoot: "/repos/app-a",
      oldBranch: "feature/old-name",
      newBranch: "feature/new-name",
    });

    expect(runGit).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      gitArgs: ["branch", "-m", "feature/old-name", "feature/new-name"],
    });
  });

  it("リモート変更時は set-upstream 付きで push する", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const dependencies = createWorktreeRenameDependencies({ runGit });

    await dependencies.pushRemoteBranch({
      repoRoot: "/repos/app-a",
      remote: "origin",
      branch: "feature/new-name",
      setUpstream: true,
    });

    expect(runGit).toHaveBeenCalledWith({
      repoRoot: "/repos/app-a",
      gitArgs: ["push", "--set-upstream", "origin", "feature/new-name"],
    });
  });

  it("リモート一覧取得に失敗した場合は空配列を返す", async () => {
    const runGit = vi.fn(async () => ({ stdout: "", stderr: "" }));
    runGit.mockRejectedValueOnce(new Error("failed"));
    const dependencies = createWorktreeRenameDependencies({ runGit });

    await expect(dependencies.listRemotes({ repoRoot: "/repos/app-a" })).resolves.toEqual([]);
  });
});

describe("createWorktreeRenameInfra", () => {
  it("リポジトリ配下で git コマンドを実行する", async () => {
    const execFileMock = vi.fn(async () => ({ stdout: "ok", stderr: "" }));
    const infra = createWorktreeRenameInfra({ execFileImpl: execFileMock });

    const result = await infra.runGit({
      repoRoot: "/repos/app-a",
      gitArgs: ["status", "--short"],
    });

    expect(execFileMock).toHaveBeenCalledWith("git", ["-C", "/repos/app-a", "status", "--short"], {
      cwd: "/repos/app-a",
    });
    expect(result).toEqual({ stdout: "ok", stderr: "" });
  });
});
