import { describe, expect, it, vi } from "vitest";

import { createGenerateWorktreeBranchNameDependencies } from "./generate-worktree-branch-name-dependencies";

describe("createGenerateWorktreeBranchNameDependencies", () => {
  it("generateBranchName を infra に委譲する", async () => {
    const request = {
      repoRoot: "/repos/app-a",
      prompt: "Generate branch",
    };
    const generateBranchNameWithCodexExec = vi.fn(async () => "fix/focus-edge");
    const dependencies = createGenerateWorktreeBranchNameDependencies({
      generateBranchNameWithCodexExec,
    });

    const result = await dependencies.generateBranchName(request);

    expect(generateBranchNameWithCodexExec).toHaveBeenCalledWith(request);
    expect(result).toBe("fix/focus-edge");
  });
});
