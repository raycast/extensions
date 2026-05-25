import { describe, expect, it } from "vitest";

import { worktreeCreateService } from "./worktree-create.service";

describe("buildDestinationPathSegments", () => {
  it("repository 配下に branch の slash 構造を保ったパス要素を作る", () => {
    expect(
      worktreeCreateService.buildDestinationPathSegments({
        mapValue: "app",
        branch: "feature/create_worktree_path",
      }),
    ).toEqual({ ok: true, value: ["app", "feature", "create_worktree_path"] });
  });

  it("特殊文字列や underscore を branch 名の一部として保持する", () => {
    expect(
      worktreeCreateService.buildDestinationPathSegments({
        mapValue: "app",
        branch: "feature/add__name_with_under_score",
      }),
    ).toEqual({ ok: true, value: ["app", "feature", "add__name_with_under_score"] });
  });

  it("パス要素として危険な文字を hyphen に正規化する", () => {
    expect(
      worktreeCreateService.buildDestinationPathSegments({
        mapValue: " app/mobile ",
        branch: "feature/ui polish",
      }),
    ).toEqual({ ok: true, value: ["app-mobile", "feature", "ui-polish"] });
  });

  it("repository mapping が空なら英語エラーを返す", () => {
    expect(
      worktreeCreateService.buildDestinationPathSegments({
        mapValue: "  ",
        branch: "feature/a",
      }),
    ).toEqual({ ok: false, error: "Repository mapping is required." });
  });

  it("branch のパス要素が空なら英語エラーを返す", () => {
    expect(
      worktreeCreateService.buildDestinationPathSegments({
        mapValue: "app",
        branch: "feature//a",
      }),
    ).toEqual({ ok: false, error: "Worktree branch path contains an invalid segment." });
  });
});

describe("parseCreatedWorktreePath", () => {
  it("Created worktree 行から作成先パスを抽出する", () => {
    const stdout = ["Preparing worktree", "Created worktree: /tmp/worktrees/app-a~_~feature-a", ""].join("\n");

    expect(worktreeCreateService.parseCreatedPath(stdout)).toBe("/tmp/worktrees/app-a~_~feature-a");
  });

  it("Created worktree 行が無いときは null を返す", () => {
    const stdout = ["Preparing worktree", "Done", ""].join("\n");

    expect(worktreeCreateService.parseCreatedPath(stdout)).toBeNull();
  });

  it("Created worktree 行の値が空文字のときは null を返す", () => {
    const stdout = ["Created worktree:   ", ""].join("\n");

    expect(worktreeCreateService.parseCreatedPath(stdout)).toBeNull();
  });
});
