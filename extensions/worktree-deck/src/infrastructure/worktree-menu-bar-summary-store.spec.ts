import { describe, expect, it, vi } from "vitest";

const raycastMocks = vi.hoisted(() => {
  return {
    localStorageGetItem: vi.fn<() => Promise<string | null>>(),
    localStorageSetItem: vi.fn<(_key: string, _value: string) => Promise<void>>(),
  };
});

vi.mock("@raycast/api", () => {
  return {
    LocalStorage: {
      getItem: raycastMocks.localStorageGetItem,
      setItem: raycastMocks.localStorageSetItem,
    },
  };
});

import { loadStoredWorktreeMenuBarSummary, saveStoredWorktreeMenuBarSummary } from "./worktree-menu-bar-summary-store";
import type { WorktreeMenuBarSummarySnapshot } from "../domain/worktree-menu-bar-summary.service";

describe("worktree-menu-bar-summary-store", () => {
  it("直近正常値を Raycast LocalStorage に保存して復元する", async () => {
    const snapshot: WorktreeMenuBarSummarySnapshot = {
      summary: { blue: 2, green: 3, yellow: 1 },
      total: 6,
    };
    raycastMocks.localStorageSetItem.mockResolvedValue();

    await saveStoredWorktreeMenuBarSummary(snapshot);

    const storedValue = raycastMocks.localStorageSetItem.mock.calls[0]?.[1] ?? "";
    raycastMocks.localStorageGetItem.mockResolvedValue(storedValue);
    await expect(loadStoredWorktreeMenuBarSummary()).resolves.toEqual(snapshot);
  });
});
