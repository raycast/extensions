import { describe, expect, it, vi } from "vitest";

import {
  createWorktreeMergeInfra,
  createBuildWorktreeMergePlanDependencies,
  createMergeWorktreeIntoBaseDependencies,
} from "./worktree-merge-dependencies";

describe("createBuildWorktreeMergePlanDependencies", () => {
  it("計画作成の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "feature/a"),
      resolveMergeTargetRef: vi.fn(async () => "origin/main"),
      listRemotes: vi.fn(async () => ["origin"]),
      checkLocalBranchExists: vi.fn(async () => true),
      checkWorktreeClean: vi.fn(async () => true),
      switchBranch: vi.fn(async () => undefined),
      createTrackingBranch: vi.fn(async () => undefined),
      mergeBranch: vi.fn(async () => undefined),
    };
    const dependencies = createBuildWorktreeMergePlanDependencies(infra);

    const [branch, targetRef, remotes, exists] = await Promise.all([
      dependencies.readCurrentBranch("/repo/worktree"),
      dependencies.resolveMergeTargetRef("/repo/worktree"),
      dependencies.listRemotes("/repo/root"),
      dependencies.checkLocalBranchExists("/repo/root", "main"),
    ]);

    expect(branch).toBe("feature/a");
    expect(targetRef).toBe("origin/main");
    expect(remotes).toEqual(["origin"]);
    expect(exists).toBe(true);
  });
});

describe("createMergeWorktreeIntoBaseDependencies", () => {
  it("マージ実行の依存ポートへ infra を委譲する", async () => {
    const infra = {
      readCurrentBranch: vi.fn(async () => "develop"),
      resolveMergeTargetRef: vi.fn(async () => "origin/main"),
      listRemotes: vi.fn(async () => ["origin"]),
      checkLocalBranchExists: vi.fn(async () => true),
      checkWorktreeClean: vi.fn(async () => true),
      switchBranch: vi.fn(async () => undefined),
      createTrackingBranch: vi.fn(async () => undefined),
      mergeBranch: vi.fn(async () => undefined),
    };
    const dependencies = createMergeWorktreeIntoBaseDependencies(infra);

    await dependencies.checkWorktreeClean("/repo/worktree");
    await dependencies.checkLocalBranchExists("/repo/root", "main");
    await dependencies.readCurrentBranch("/repo/root");
    await dependencies.createTrackingBranch("/repo/root", "main", "origin/main");
    await dependencies.switchBranch("/repo/root", "main");
    await dependencies.mergeBranch("/repo/root", "feature/a");

    expect(infra.checkWorktreeClean).toHaveBeenCalledWith("/repo/worktree");
    expect(infra.checkLocalBranchExists).toHaveBeenCalledWith("/repo/root", "main");
    expect(infra.readCurrentBranch).toHaveBeenCalledWith("/repo/root");
    expect(infra.createTrackingBranch).toHaveBeenCalledWith("/repo/root", "main", "origin/main");
    expect(infra.switchBranch).toHaveBeenCalledWith("/repo/root", "main");
    expect(infra.mergeBranch).toHaveBeenCalledWith("/repo/root", "feature/a");
  });
});

describe("createWorktreeMergeInfra", () => {
  it("git 実行と merge target 解決を infra 関数として公開する", async () => {
    const runGit = vi.fn(async (_repoRoot: string, gitArgs: string[]) => {
      if (gitArgs[0] === "symbolic-ref") {
        return { stdout: "feature/test\n", stderr: "" };
      }
      if (gitArgs[0] === "remote") {
        return { stdout: "origin\nupstream\n", stderr: "" };
      }
      if (gitArgs[0] === "status") {
        return { stdout: "", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    const resolveTargetRef = vi.fn(async () => "origin/main");
    const infra = createWorktreeMergeInfra({
      runGit,
      resolveMergeTargetRef: resolveTargetRef,
    });

    await expect(infra.readCurrentBranch("/repo/worktree")).resolves.toBe("feature/test");
    await expect(infra.resolveMergeTargetRef("/repo/worktree")).resolves.toBe("origin/main");
    await expect(infra.listRemotes("/repo/root")).resolves.toEqual(["origin", "upstream"]);
    await expect(infra.checkWorktreeClean("/repo/worktree")).resolves.toBe(true);
  });

  it("runGitByObject から内部で runGit を生成できる", async () => {
    const runGitByObject = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const infra = createWorktreeMergeInfra({
      resolveMergeTargetRef: vi.fn(async () => "origin/main"),
      runGitByObject,
    });

    await infra.checkWorktreeClean("/repo/root");

    expect(runGitByObject).toHaveBeenCalledWith({
      repoRoot: "/repo/root",
      gitArgs: ["status", "--porcelain"],
    });
  });
});
