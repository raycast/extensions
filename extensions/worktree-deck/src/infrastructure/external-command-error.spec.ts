import { describe, expect, it } from "vitest";

import {
  ExternalCommandNotFoundError,
  formatMissingExternalCommandMessage,
  isMissingExternalCommandError,
  normalizeExternalCommandError,
} from "./external-command-error";

describe("external-command-error", () => {
  it("git 未導入を worktree 操作用の案内文へ変換する", () => {
    const error = normalizeExternalCommandError({ code: "ENOENT", syscall: "spawn git" }, "git", "git-worktree");

    expect(error).toBeInstanceOf(ExternalCommandNotFoundError);
    expect(error).toEqual(expect.objectContaining({ command: "git" }));
    expect((error as Error).message).toBe(
      "Git is required to manage worktrees. Install Git and ensure it is available in PATH.",
    );
    expect(isMissingExternalCommandError(error, "git")).toBe(true);
  });

  it("gh 未導入を PR 作成専用の案内文へ変換する", () => {
    expect(formatMissingExternalCommandMessage("gh", "pull-request")).toBe(
      "GitHub CLI (gh) is required to create pull requests. Install gh and run gh auth login.",
    );
  });

  it("Codex 未導入を Codex 操作専用の案内文へ変換する", () => {
    expect(formatMissingExternalCommandMessage("codex", "codex-action")).toBe(
      "Codex CLI is required for Codex actions. Install Codex and ensure it is available in PATH.",
    );
  });
});
