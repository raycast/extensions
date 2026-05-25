import { describe, expect, it } from "vitest";

import { loadBasePath } from "./worktree-config-store";

/**
 * テスト用の env lookup context を返す
 */
function buildArgs(args?: { env?: NodeJS.ProcessEnv }) {
  return {
    env: args?.env ?? {},
    cwd: "/tmp/current",
    homeDir: "/Users/tester",
    packageDir: "/tmp/app",
    packageName: "worktree-deck",
  };
}

describe("loadBasePath", () => {
  it("環境変数の GIT_WORKTREE_PATH は home path を展開する", async () => {
    const result = await loadBasePath(buildArgs({ env: { GIT_WORKTREE_PATH: "~/.worktree-deck/worktrees" } }));

    expect(result).toBe("/Users/tester/.worktree-deck/worktrees");
  });

  it("GIT_WORKTREE_PATH が未設定なら Raycast Preferences の入力を促す", async () => {
    await expect(loadBasePath(buildArgs())).rejects.toThrow(
      "GIT_WORKTREE_PATH is not set. Set it in Raycast Preferences.",
    );
  });
});
