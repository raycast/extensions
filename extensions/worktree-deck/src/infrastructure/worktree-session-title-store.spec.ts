import { beforeEach, describe, expect, it, vi } from "vitest";

const readStorageMock = vi.hoisted(() => vi.fn());
const writeStorageMock = vi.hoisted(() => vi.fn());

vi.mock("./storage/json-file-storage", () => {
  return {
    readWorktreeDeckFileStorageJson: readStorageMock,
    writeWorktreeDeckFileStorageJson: writeStorageMock,
  };
});

import {
  loadExplicitSessionTitlesForWorktreePaths,
  saveExplicitSessionTitleForThread,
} from "./worktree-session-title-store";

describe("worktree-session-title-store", () => {
  beforeEach(() => {
    readStorageMock.mockReset();
    writeStorageMock.mockReset();
    readStorageMock.mockResolvedValue({});
    writeStorageMock.mockResolvedValue(undefined);
  });

  it("worktree path に関係する明示タイトルだけを読み込む", async () => {
    readStorageMock.mockResolvedValue({
      "thread-1": {
        threadId: "thread-1",
        worktreePath: "/repo/a",
        title: "A",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
      },
      "thread-2": {
        threadId: "thread-2",
        worktreePath: "/repo/b",
        title: "B",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
      },
    });

    const result = await loadExplicitSessionTitlesForWorktreePaths({
      paths: ["/repo/a"],
      env: {},
      cwd: "/repo",
      homeDir: null,
      packageDir: "/repo",
      packageName: "worktree-deck",
    });

    expect(result.byThreadId.get("thread-1")?.title).toBe("A");
    expect(result.byThreadId.has("thread-2")).toBe(false);
    expect(result.byWorktreePath.get("/repo/a")?.map((entry) => entry.threadId)).toEqual(["thread-1"]);
  });

  it("明示タイトルを thread id 主キーで保存する", async () => {
    readStorageMock.mockResolvedValue({
      "thread-1": {
        threadId: "thread-1",
        worktreePath: "/repo/a",
        title: "Old",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z",
      },
    });

    const result = await saveExplicitSessionTitleForThread({
      threadId: "thread-1",
      worktreePath: "/repo/a",
      title: "New",
    });

    expect(result?.createdAt).toBe("2026-05-19T00:00:00.000Z");
    expect(writeStorageMock).toHaveBeenCalledWith(expect.anything(), "worktree-session-titles.json", {
      "thread-1": expect.objectContaining({
        threadId: "thread-1",
        worktreePath: "/repo/a",
        title: "New",
        source: "auto-start",
        createdAt: "2026-05-19T00:00:00.000Z",
      }),
    });
  });
});
