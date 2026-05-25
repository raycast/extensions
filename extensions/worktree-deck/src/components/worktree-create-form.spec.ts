import { describe, expect, it, vi } from "vitest";
import {
  buildBaseBranchOptions,
  buildCreateWorktreeFormItemOrder,
  CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS,
  DEFAULT_CREATE_WORKTREE_AUTO_START,
  createSequentialImageAttachmentRunner,
  extractLocalBranchNameFromRef,
  formatImageAttachmentSummary,
  formatImageAttachmentControlsText,
  normalizeBaseRefDropdownValue,
  openWorktreeWhenReady,
  resolveCreateWorktreeFormImagePaths,
  resolveCreateWorktreeFormFocusRestoreItemId,
  resetCreateWorktreeFormDraftStorage,
  resolveDefaultBaseBranchValue,
  resolveDropdownValue,
} from "./worktree-create-form";

describe("buildCreateWorktreeFormItemOrder", () => {
  it("手動 branch モードでは Branch Name が表示される", () => {
    expect(buildCreateWorktreeFormItemOrder({ autoStart: false, hasBaseBranchError: false })).toEqual([
      "branch",
      "spacing",
      "repoRoot",
      "baseBranch",
      "openApp",
    ]);
  });

  it("Auto Start モードでは Images サマリーをプロンプト直下に表示する", () => {
    expect(buildCreateWorktreeFormItemOrder({ autoStart: true, hasBaseBranchError: false })).toEqual([
      "initialPrompt",
      "imagePaths",
      "repoRoot",
      "baseBranch",
      "openApp",
      "spacing",
      "reasoningEffort",
      "model",
      "serviceTier",
      "permissions",
    ]);
  });

  it("Auto Start モードでは Initial Prompt の直後に Images サマリーを表示する", () => {
    expect(buildCreateWorktreeFormItemOrder({ autoStart: true, hasBaseBranchError: false }).slice(0, 2)).toEqual([
      "initialPrompt",
      "imagePaths",
    ]);
  });

  it("Base Branch Error がある場合は Base Branch の直後に表示される", () => {
    expect(buildCreateWorktreeFormItemOrder({ autoStart: false, hasBaseBranchError: true })).toEqual([
      "branch",
      "spacing",
      "repoRoot",
      "baseBranch",
      "baseBranchError",
      "openApp",
    ]);
  });

  it("Auto Start モードで Base Branch Error がある場合も Open With の前に表示される", () => {
    expect(buildCreateWorktreeFormItemOrder({ autoStart: true, hasBaseBranchError: true })).toEqual([
      "initialPrompt",
      "imagePaths",
      "repoRoot",
      "baseBranch",
      "baseBranchError",
      "openApp",
      "spacing",
      "reasoningEffort",
      "model",
      "serviceTier",
      "permissions",
    ]);
  });
});

describe("DEFAULT_CREATE_WORKTREE_AUTO_START", () => {
  it("保持済みドラフトがない場合は Auto Start を既定にする", () => {
    expect(DEFAULT_CREATE_WORKTREE_AUTO_START).toBe(true);
  });
});

describe("resolveCreateWorktreeFormFocusRestoreItemId", () => {
  it("表示中の focus 可能 item はそのまま復元対象にする", () => {
    expect(
      resolveCreateWorktreeFormFocusRestoreItemId({
        itemId: "baseBranch",
        autoStart: true,
        hasBaseBranchError: false,
      }),
    ).toBe("baseBranch");
  });

  it("Auto Start で非表示 item が記録されている場合は Initial Prompt へ戻す", () => {
    expect(
      resolveCreateWorktreeFormFocusRestoreItemId({
        itemId: "branch",
        autoStart: true,
        hasBaseBranchError: false,
      }),
    ).toBe("initialPrompt");
  });

  it("手動 branch モードで非表示 item が記録されている場合は Branch Name へ戻す", () => {
    expect(
      resolveCreateWorktreeFormFocusRestoreItemId({
        itemId: "initialPrompt",
        autoStart: false,
        hasBaseBranchError: false,
      }),
    ).toBe("branch");
  });
});

describe("resolveDropdownValue", () => {
  it("候補に存在する値はそのまま返す", () => {
    expect(resolveDropdownValue({ selectedValue: "repo-a", optionValues: ["repo-a", "repo-b"] })).toBe("repo-a");
  });

  it("候補に存在しない値は空文字を返す", () => {
    expect(resolveDropdownValue({ selectedValue: "/tmp/missing", optionValues: [] })).toBe("");
  });

  it("未選択時は空文字を返す", () => {
    expect(resolveDropdownValue({ selectedValue: "", optionValues: ["main", "develop"] })).toBe("");
  });
});

describe("normalizeBaseRefDropdownValue", () => {
  it("refs/remotes の参照を remote branch 表記へ変換する", () => {
    expect(normalizeBaseRefDropdownValue("refs/remotes/origin/main")).toBe("origin/main");
  });

  it("refs/heads の参照を branch 表記へ変換する", () => {
    expect(normalizeBaseRefDropdownValue("refs/heads/main")).toBe("main");
  });
});

describe("extractLocalBranchNameFromRef", () => {
  it("remote branch 参照から branch 名を抽出する", () => {
    expect(extractLocalBranchNameFromRef("origin/main")).toBe("main");
  });
});

describe("resolveDefaultBaseBranchValue", () => {
  it("default branch と同名の local branch が候補にあれば local branch を選ぶ", () => {
    expect(resolveDefaultBaseBranchValue({ defaultBaseRef: "origin/main", optionValues: ["develop", "main"] })).toBe(
      "main",
    );
  });

  it("local branch がなければ remote branch 候補を選ぶ", () => {
    expect(resolveDefaultBaseBranchValue({ defaultBaseRef: "origin/main", optionValues: ["origin/main"] })).toBe(
      "origin/main",
    );
  });

  it("default base ref が候補になければ空文字を返す", () => {
    expect(resolveDefaultBaseBranchValue({ defaultBaseRef: "origin/main", optionValues: ["develop"] })).toBe("");
  });
});

describe("buildBaseBranchOptions", () => {
  it("default branch と同名の local branch があれば候補を追加しない", () => {
    expect(buildBaseBranchOptions({ branches: ["develop", "main"], defaultBaseRef: "origin/main" })).toEqual([
      { value: "develop", title: "develop" },
      { value: "main", title: "main" },
    ]);
  });

  it("default branch の local branch がなければ remote branch 候補を先頭に追加する", () => {
    expect(buildBaseBranchOptions({ branches: ["develop"], defaultBaseRef: "origin/main" })).toEqual([
      { value: "origin/main", title: "origin/main" },
      { value: "develop", title: "develop" },
    ]);
  });
});

describe("resolveCreateWorktreeFormImagePaths", () => {
  it("FilePicker の選択値を送信用画像パスへ正規化する", () => {
    expect(
      resolveCreateWorktreeFormImagePaths({
        pickerValue: [" /tmp/a.png ", "", "/tmp/a.png", "/tmp/b.jpg"],
        draftText: "/tmp/draft.png",
      }),
    ).toEqual(["/tmp/a.png", "/tmp/b.jpg"]);
  });

  it("FilePicker の値がない場合は保存済みドラフトを使う", () => {
    expect(
      resolveCreateWorktreeFormImagePaths({
        draftText: " /tmp/draft.png\n/tmp/other.jpg ",
      }),
    ).toEqual(["/tmp/draft.png", "/tmp/other.jpg"]);
  });
});

describe("formatImageAttachmentSummary", () => {
  it("1枚の場合は単数形で表示する", () => {
    expect(formatImageAttachmentSummary(1)).toBe("1 image");
  });

  it("複数枚の場合は複数形で表示する", () => {
    expect(formatImageAttachmentSummary(2)).toBe("2 images");
  });
});

describe("formatImageAttachmentControlsText", () => {
  it("添付数と3種類の添付操作を表示する", () => {
    expect(formatImageAttachmentControlsText(2)).toBe("2 images | Clipboard ⌘⇧C | Shot ⌘⇧S | Finder ⌘⇧F");
  });
});

describe("createSequentialImageAttachmentRunner", () => {
  it("画像添付処理を呼び出し順に直列実行する", async () => {
    const run = createSequentialImageAttachmentRunner();
    let releaseFirst = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const order: string[] = [];

    const first = run(async () => {
      order.push("first:start");
      await firstGate;
      order.push("first:end");
      return "first";
    });
    const second = run(async () => {
      order.push("second:start");
      return "second";
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);

    releaseFirst();
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("前の画像添付処理が失敗しても次の処理を実行する", async () => {
    const run = createSequentialImageAttachmentRunner();

    await expect(
      run(async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow("failed");
    await expect(run(async () => "next")).resolves.toBe("next");
  });
});

describe("openWorktreeWhenReady", () => {
  it("選択したアプリで開いた後にアプリケーションを閉じる", async () => {
    const delayMock = vi.fn(async () => undefined);
    const openMock = vi.fn(async () => undefined);
    const closeMock = vi.fn(async () => undefined);

    await openWorktreeWhenReady("/worktrees/app-a~_~feature-a", "codex-app", {
      delay: delayMock,
      openPathInPreferredApp: openMock,
      closeMainWindow: closeMock,
    });

    expect(delayMock).toHaveBeenCalledWith(700);
    expect(openMock).toHaveBeenCalledWith("/worktrees/app-a~_~feature-a", "codex-app");
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(openMock.mock.invocationCallOrder[0]).toBeLessThan(closeMock.mock.invocationCallOrder[0]);
  });
});

describe("resetCreateWorktreeFormDraftStorage", () => {
  it("作成成功後に保持値を削除する", async () => {
    const removeItemMock = vi.fn(async () => undefined);

    await resetCreateWorktreeFormDraftStorage({ removeItem: removeItemMock });

    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.autoStart);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.initialPrompt);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.imagePathsText);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.model);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.serviceTier);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.reasoningEffort);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.permissions);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.approvalPolicy);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.sandboxMode);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.approvalsReviewer);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.webSearch);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.branch);
    expect(removeItemMock).toHaveBeenCalledWith(CREATE_WORKTREE_FORM_DRAFT_STORAGE_KEYS.openApp);
    expect(removeItemMock).toHaveBeenCalledTimes(13);
  });
});
