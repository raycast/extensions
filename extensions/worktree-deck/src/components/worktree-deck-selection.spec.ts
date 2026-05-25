import { describe, expect, it } from "vitest";

import type { Worktree } from "../application/worktree.entity";
import type { SectionEntry } from "./worktree-deck-view-model";
import {
  buildPersistedSelectionState,
  buildSelectionIndex,
  resolveControlledListSelectionItemId,
  resolveFallbackSelectionItemId,
  resolveInitialSelectionRestoreApplication,
  resolvePostLoadSelectionRestorePhase,
  resolveRestoredSelectionItemId,
  resolveSelectionChangeDecision,
  shouldScheduleInitialSelectionUnlock,
  type SelectionRestorePhase,
} from "./worktree-deck-selection";

/**
 * テスト用 worktree エントリを作る
 */
function buildWorktreeEntry(args: { repo?: string; path: string; branch?: string; originPath?: string }): SectionEntry {
  const item: Worktree = {
    repo: args.repo ?? "repo-a",
    path: args.path,
    branch: args.branch,
    originPath: args.originPath,
  };
  return { kind: "worktree", item };
}

/**
 * テスト用 origin エントリを作る
 */
function buildOriginEntry(originPath: string): SectionEntry {
  return {
    kind: "origin",
    originPath,
    titles: [],
    lastCommitAt: null,
    branch: null,
  };
}

/**
 * テスト用の選択インデックスを作る
 */
function buildIndex(entries: SectionEntry[]) {
  return buildSelectionIndex([{ entries }]);
}

describe("worktree-deck-selection", () => {
  it("選択中 item から永続化データを作る", () => {
    const selectionIndex = buildIndex([
      buildOriginEntry("/repos/repo-a"),
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-a",
        branch: "feature-a",
        originPath: "/repos/repo-a",
      }),
    ]);

    const result = buildPersistedSelectionState({
      basePath: "/tmp/worktrees",
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      selectionIndex,
    });

    expect(result).toEqual({
      version: 1,
      basePath: "/tmp/worktrees",
      itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      kind: "worktree",
      path: "/tmp/worktrees/repo-a~_~feature-a",
      originPath: "/repos/repo-a",
    });
  });

  it("保存済み itemId が現在の一覧にあればそれを復元する", () => {
    const selectionIndex = buildIndex([
      buildOriginEntry("/repos/repo-a"),
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-a",
        branch: "feature-a",
        originPath: "/repos/repo-a",
      }),
    ]);

    const result = resolveRestoredSelectionItemId({
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
        kind: "worktree",
        path: "/tmp/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(result).toBe("worktree:/tmp/worktrees/repo-a~_~feature-a");
  });

  it("itemId が変わっても同じ path の worktree を優先する", () => {
    const selectionIndex = buildIndex([
      buildOriginEntry("/repos/repo-a"),
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-a",
        branch: "renamed-feature-a",
        originPath: "/repos/repo-a",
      }),
    ]);

    const result = resolveRestoredSelectionItemId({
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "worktree:old-id",
        kind: "worktree",
        path: "/tmp/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(result).toBe("worktree:/tmp/worktrees/repo-a~_~feature-a");
  });

  it("path が消えても同じ origin item にフォールバックする", () => {
    const selectionIndex = buildIndex([
      buildOriginEntry("/repos/repo-a"),
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-b",
        branch: "feature-b",
        originPath: "/repos/repo-a",
      }),
    ]);

    const result = resolveRestoredSelectionItemId({
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
        kind: "worktree",
        path: "/tmp/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(result).toBe("origin:/repos/repo-a");
  });

  it("origin item がないときは同じ origin の worktree にフォールバックする", () => {
    const selectionIndex = buildIndex([
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-b",
        branch: "feature-b",
        originPath: "/repos/repo-a",
      }),
    ]);

    const result = resolveRestoredSelectionItemId({
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
        kind: "worktree",
        path: "/tmp/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(result).toBe("worktree:/tmp/worktrees/repo-a~_~feature-b");
  });

  it("basePath が異なるときは先頭 item にフォールバックする", () => {
    const selectionIndex = buildIndex([
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-b~_~feature-b",
        branch: "feature-b",
        originPath: "/repos/repo-b",
      }),
    ]);

    const result = resolveRestoredSelectionItemId({
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/other/worktrees",
        itemId: "worktree:/other/worktrees/repo-a~_~feature-a",
        kind: "worktree",
        path: "/other/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(result).toBe("worktree:/tmp/worktrees/repo-b~_~feature-b");
  });

  it("選択中 item が消えたときは先頭 item にフォールバックする", () => {
    const selectionIndex = buildIndex([
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-b",
        branch: "feature-b",
      }),
    ]);

    const result = resolveFallbackSelectionItemId({
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      selectionIndex,
    });

    expect(result).toBe("worktree:/tmp/worktrees/repo-a~_~feature-b");
  });

  it("ready 前の選択変更イベントは無視する", () => {
    const result = resolveSelectionChangeDecision({
      phase: "settling-list",
      currentItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      nextItemId: "origin:/repos/repo-a",
    });

    expect(result).toBe("ignore");
  });

  it("ready 後の別 item への選択変更イベントは受理する", () => {
    const result = resolveSelectionChangeDecision({
      phase: "ready",
      currentItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      nextItemId: "origin:/repos/repo-a",
    });

    expect(result).toBe("accept");
  });

  it("起動復元中の誤発火 selection event は保存対象にしない", () => {
    const selectionIndex = buildIndex([
      buildOriginEntry("/repos/repo-a"),
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-a",
        branch: "feature-a",
        originPath: "/repos/repo-a",
      }),
    ]);
    const application = resolveInitialSelectionRestoreApplication({
      phase: "waiting-first-list",
      isLoading: false,
      currentBasePath: "/tmp/worktrees",
      persistedSelection: {
        version: 1,
        basePath: "/tmp/worktrees",
        itemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
        kind: "worktree",
        path: "/tmp/worktrees/repo-a~_~feature-a",
        originPath: "/repos/repo-a",
      },
      selectionIndex,
    });

    expect(application).toEqual({
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      phase: "applying-restored-selection",
    });
    expect(
      resolveSelectionChangeDecision({
        phase: application?.phase ?? "ready",
        currentItemId: application?.selectedItemId ?? null,
        nextItemId: "origin:/repos/repo-a",
      }),
    ).toBe("ignore");
  });

  it("初期 snapshot から追加読み込み完了までの復元フェーズを遷移する", () => {
    let phase: SelectionRestorePhase = "waiting-first-list";
    const selectionIndex = buildIndex([
      buildWorktreeEntry({
        path: "/tmp/worktrees/repo-a~_~feature-a",
        branch: "feature-a",
        originPath: "/repos/repo-a",
      }),
    ]);

    const application = resolveInitialSelectionRestoreApplication({
      phase,
      isLoading: false,
      currentBasePath: "/tmp/worktrees",
      persistedSelection: null,
      selectionIndex,
    });

    expect(application).toEqual({
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      phase: "applying-restored-selection",
    });

    phase = application?.phase ?? phase;
    phase = resolvePostLoadSelectionRestorePhase({
      phase,
      isLoading: false,
      isTitlesLoading: true,
      isDetailsLoading: false,
    });
    expect(phase).toBe("applying-restored-selection");

    phase = resolvePostLoadSelectionRestorePhase({
      phase,
      isLoading: false,
      isTitlesLoading: false,
      isDetailsLoading: true,
    });
    expect(phase).toBe("applying-restored-selection");

    phase = resolvePostLoadSelectionRestorePhase({
      phase,
      isLoading: false,
      isTitlesLoading: false,
      isDetailsLoading: false,
    });
    expect(phase).toBe("settling-list");
    expect(
      shouldScheduleInitialSelectionUnlock({
        phase,
        isLoading: false,
        isTitlesLoading: false,
        isDetailsLoading: false,
        selectedItemId: application?.selectedItemId ?? null,
        availableItemIds: selectionIndex.itemIds,
      }),
    ).toBe(true);
  });

  it("タイトルと詳細の読み込み中は初期選択保護を解除しない", () => {
    const input = {
      phase: "settling-list",
      isLoading: false,
      isTitlesLoading: true,
      isDetailsLoading: false,
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      availableItemIds: ["worktree:/tmp/worktrees/repo-a~_~feature-a"],
    } satisfies Parameters<typeof shouldScheduleInitialSelectionUnlock>[0];

    expect(shouldScheduleInitialSelectionUnlock(input)).toBe(false);
    expect(shouldScheduleInitialSelectionUnlock({ ...input, isTitlesLoading: false, isDetailsLoading: true })).toBe(
      false,
    );
  });

  it("一覧と追加情報の読み込みが終わり選択 item が存在すると初期選択保護解除を許可する", () => {
    const input = {
      phase: "settling-list",
      isLoading: false,
      isTitlesLoading: false,
      isDetailsLoading: false,
      selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      availableItemIds: ["worktree:/tmp/worktrees/repo-a~_~feature-a"],
    } satisfies Parameters<typeof shouldScheduleInitialSelectionUnlock>[0];

    expect(shouldScheduleInitialSelectionUnlock(input)).toBe(true);
  });

  it("初期復元中だけ List の controlled selection を有効にする", () => {
    expect(
      resolveControlledListSelectionItemId({
        phase: "applying-restored-selection",
        selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      }),
    ).toBe("worktree:/tmp/worktrees/repo-a~_~feature-a");
    expect(
      resolveControlledListSelectionItemId({
        phase: "settling-list",
        selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      }),
    ).toBe("worktree:/tmp/worktrees/repo-a~_~feature-a");
    expect(
      resolveControlledListSelectionItemId({
        phase: "ready",
        selectedItemId: "worktree:/tmp/worktrees/repo-a~_~feature-a",
      }),
    ).toBeUndefined();
  });
});
