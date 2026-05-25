import { beforeEach, describe, expect, it, vi } from "vitest";

const localStorageGetItemMock = vi.hoisted(() => vi.fn());
const localStorageSetItemMock = vi.hoisted(() => vi.fn());

vi.mock("@raycast/api", () => {
  return {
    LocalStorage: {
      getItem: localStorageGetItemMock,
      setItem: localStorageSetItemMock,
    },
  };
});

import { loadPersistedSelectionFromStorage, savePersistedSelectionToStorage } from "./worktree-deck-selection-store";

describe("worktree-deck-selection-store", () => {
  beforeEach(() => {
    localStorageGetItemMock.mockReset();
    localStorageSetItemMock.mockReset();
  });

  it("保存済み選択状態を正規化して読み込む", async () => {
    localStorageGetItemMock.mockResolvedValue(
      JSON.stringify({
        version: 1,
        basePath: " /tmp/worktrees ",
        itemId: " worktree:/tmp/worktrees/repo-a~_~feature-a ",
        kind: "worktree",
        path: " /tmp/worktrees/repo-a~_~feature-a ",
        originPath: " /repos/repo-a ",
      }),
    );

    await expect(loadPersistedSelectionFromStorage()).resolves.toEqual({
      version: 1,
      basePath: "/tmp/worktrees",
      itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      kind: "worktree",
      path: "/tmp/worktrees/repo-a~_~feature-a",
      originPath: "/repos/repo-a",
    });
  });

  it("壊れた保存値は null として扱う", async () => {
    localStorageGetItemMock.mockResolvedValue("{not-json");

    await expect(loadPersistedSelectionFromStorage()).resolves.toBeNull();
  });

  it("選択状態を JSON として保存する", async () => {
    localStorageSetItemMock.mockResolvedValue(undefined);

    await savePersistedSelectionToStorage({
      version: 1,
      basePath: "/tmp/worktrees",
      itemId: "origin:/repos/repo-a",
      kind: "origin",
      path: "/repos/repo-a",
      originPath: "/repos/repo-a",
    });

    expect(localStorageSetItemMock).toHaveBeenCalledWith(
      "worktree-deck.selection",
      JSON.stringify({
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "origin:/repos/repo-a",
        kind: "origin",
        path: "/repos/repo-a",
        originPath: "/repos/repo-a",
      }),
    );
  });
});
