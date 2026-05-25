import { describe, expect, it } from "vitest";

import { worktreeRenameService } from "./worktree-rename.service";

describe("normalizeBranchName", () => {
  it("空白を除去して有効なブランチ名を返す", () => {
    expect(worktreeRenameService.normalizeBranchName(" feature/test ")).toBe("feature/test");
  });

  it("root と空文字は変更対象外として null を返す", () => {
    expect(worktreeRenameService.normalizeBranchName("root")).toBeNull();
    expect(worktreeRenameService.normalizeBranchName("  ")).toBeNull();
  });
});

describe("selectRemoteNameForRename", () => {
  it("設定済みリモートが有効ならそれを優先する", () => {
    expect(
      worktreeRenameService.selectRemoteNameForRename({
        remotes: ["origin", "upstream"],
        configuredRemote: "upstream",
      }),
    ).toBe("upstream");
  });

  it("設定済みリモートが無効なら origin を優先する", () => {
    expect(
      worktreeRenameService.selectRemoteNameForRename({
        remotes: ["upstream", "origin"],
        configuredRemote: "missing",
      }),
    ).toBe("origin");
  });

  it("候補が空なら null を返す", () => {
    expect(
      worktreeRenameService.selectRemoteNameForRename({
        remotes: [],
        configuredRemote: null,
      }),
    ).toBeNull();
  });
});
