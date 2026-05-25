import { describe, expect, it } from "vitest";

import { worktreeBaseRefService } from "./worktree-base-ref.service";

describe("buildBaseRefConfigKey", () => {
  it("ブランチ名をエスケープして設定キーを組み立てる", () => {
    expect(worktreeBaseRefService.buildConfigKey(' feature/"quote"\\path ')).toBe(
      'branch."feature/\\"quote\\"\\\\path".worktreeDeckBaseRef',
    );
  });
});

describe("resolvePreferredBaseRef", () => {
  it("branch config を優先して baseRef を返す", () => {
    expect(
      worktreeBaseRefService.resolvePreferred({
        branchConfigBaseRef: " origin/main ",
        worktreeBaseRef: " develop ",
      }),
    ).toEqual({
      baseRef: "origin/main",
      source: "branch-config",
    });
  });

  it("branch config が無い場合は worktree storage を返す", () => {
    expect(
      worktreeBaseRefService.resolvePreferred({
        branchConfigBaseRef: null,
        worktreeBaseRef: " release/2026.02 ",
      }),
    ).toEqual({
      baseRef: "release/2026.02",
      source: "worktree-storage",
    });
  });

  it("候補が空の場合は null を返す", () => {
    expect(
      worktreeBaseRefService.resolvePreferred({
        branchConfigBaseRef: "  ",
        worktreeBaseRef: null,
      }),
    ).toEqual({
      baseRef: null,
      source: null,
    });
  });
});

describe("normalizeWorktreeBaseRefStorage", () => {
  it("文字列 JSON とオブジェクト形式を正規化する", () => {
    expect(
      worktreeBaseRefService.normalizeStorage(
        '{" /repo/a ":{"baseRef":" origin/main "},"/repo/b":" develop ","/repo/c":{"baseRef":" "}}',
      ),
    ).toEqual({
      "/repo/a": { baseRef: "origin/main" },
      "/repo/b": { baseRef: "develop" },
    });
  });

  it("不正値は空オブジェクトにフォールバックする", () => {
    expect(worktreeBaseRefService.normalizeStorage("not-json")).toEqual({});
    expect(worktreeBaseRefService.normalizeStorage(10)).toEqual({});
  });
});
