import { describe, expect, it, vi, beforeEach } from "vitest";

import type { DeletedWorktreeEntry } from "../application/deleted-worktrees.usecase";

const storageMocks = vi.hoisted(() => {
  return {
    readWorktreeDeckFileStorageJson: vi.fn(),
    writeWorktreeDeckFileStorageJson: vi.fn(),
  };
});

const childProcessMocks = vi.hoisted(() => {
  return {
    execFile: vi.fn(),
  };
});

vi.mock("./storage/json-file-storage", () => {
  return {
    readWorktreeDeckFileStorageJson: storageMocks.readWorktreeDeckFileStorageJson,
    writeWorktreeDeckFileStorageJson: storageMocks.writeWorktreeDeckFileStorageJson,
  };
});

vi.mock("node:child_process", () => {
  return {
    execFile: childProcessMocks.execFile,
  };
});

import {
  checkDeletedWorktreeLocalBranchExists,
  deleteDeletedWorktree,
  loadDeletedWorktrees,
  saveDeletedWorktrees,
  saveDeletedWorktree,
} from "./deleted-worktree-store";

/**
 * テスト用の削除済み worktree を作成する
 */
function buildEntry(args: Partial<DeletedWorktreeEntry> = {}): DeletedWorktreeEntry {
  return {
    repoRoot: args.repoRoot ?? "/repos/app",
    repoName: args.repoName ?? "app",
    worktreePath: args.worktreePath ?? "/worktrees/app~_~feature-a",
    branch: args.branch ?? "feature/a",
    baseRef: args.baseRef ?? "main",
    mapValue: args.mapValue ?? "app",
    openApp: args.openApp ?? "zed",
    removedAt: args.removedAt ?? "2026-05-14T00:00:00.000Z",
  };
}

describe("deleted-worktree-store", () => {
  beforeEach(() => {
    storageMocks.readWorktreeDeckFileStorageJson.mockReset();
    storageMocks.writeWorktreeDeckFileStorageJson.mockReset();
    childProcessMocks.execFile.mockReset();
  });

  it("削除済み worktree の保存時に同じ repoRoot と branch の古い履歴を置き換える", async () => {
    const oldEntry = buildEntry({
      worktreePath: "/worktrees/old",
      branch: "feature/a",
      removedAt: "2026-05-13T00:00:00.000Z",
    });
    const newEntry = buildEntry({
      worktreePath: "/worktrees/new",
      branch: "feature/a",
      removedAt: "2026-05-14T00:00:00.000Z",
    });
    storageMocks.readWorktreeDeckFileStorageJson.mockResolvedValueOnce([oldEntry]);

    await saveDeletedWorktree(newEntry);

    expect(storageMocks.writeWorktreeDeckFileStorageJson).toHaveBeenCalledWith(
      expect.any(Object),
      "deleted-worktrees.json",
      [newEntry],
    );
  });

  it("壊れた storage 形式は空配列として読み込む", async () => {
    storageMocks.readWorktreeDeckFileStorageJson.mockResolvedValueOnce({ invalid: true });

    await expect(loadDeletedWorktrees()).resolves.toEqual([]);
  });

  it("削除済み worktree 履歴一覧を最大保存件数まで保存する", async () => {
    const entries = Array.from({ length: 51 }, (_, index) =>
      buildEntry({ branch: `feature/${index}`, removedAt: `2026-05-14T00:00:${String(index).padStart(2, "0")}.000Z` }),
    );

    await saveDeletedWorktrees(entries);

    expect(storageMocks.writeWorktreeDeckFileStorageJson).toHaveBeenCalledWith(
      expect.any(Object),
      "deleted-worktrees.json",
      entries.slice(0, 50),
    );
  });

  it("削除済み worktree 履歴を repoRoot と branch で削除する", async () => {
    const keepEntry = buildEntry({ branch: "feature/keep" });
    const deleteEntry = buildEntry({ branch: "feature/delete" });
    storageMocks.readWorktreeDeckFileStorageJson.mockResolvedValueOnce([keepEntry, deleteEntry]);

    await deleteDeletedWorktree({ repoRoot: "/repos/app", branch: "feature/delete" });

    expect(storageMocks.writeWorktreeDeckFileStorageJson).toHaveBeenCalledWith(
      expect.any(Object),
      "deleted-worktrees.json",
      [keepEntry],
    );
  });

  it("ローカルブランチ存在確認は refs/heads を検証する", async () => {
    childProcessMocks.execFile.mockImplementation((_command, _args, _options, callback) => {
      callback(null, "", "");
    });

    await expect(checkDeletedWorktreeLocalBranchExists({ repoRoot: "/repos/app", branch: "feature/a" })).resolves.toBe(
      true,
    );
    expect(childProcessMocks.execFile).toHaveBeenCalledWith(
      "git",
      ["-C", "/repos/app", "show-ref", "--verify", "refs/heads/feature/a"],
      { cwd: "/repos/app" },
      expect.any(Function),
    );
  });

  it("git が見つからない場合はローカルブランチなし扱いにせず案内エラーで失敗する", async () => {
    childProcessMocks.execFile.mockImplementation((_command, _args, _options, callback) => {
      const error = Object.assign(new Error("spawn git ENOENT"), {
        code: "ENOENT",
        syscall: "spawn git",
        path: "git",
      });
      callback(error);
    });

    await expect(
      checkDeletedWorktreeLocalBranchExists({ repoRoot: "/repos/app", branch: "feature/a" }),
    ).rejects.toThrow("Git is required to manage worktrees. Install Git and ensure it is available in PATH.");
  });
});
