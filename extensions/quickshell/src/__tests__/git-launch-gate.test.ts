import { describe, expect, it } from "vitest";
import {
  evaluateGitLaunchGate,
  isOnTargetBranch,
  isSafeGitBranchName,
  normalizeWorktreeKey,
  switchBranch,
  type GitRunner,
} from "../lib/git-launch-gate";

function mockGit(responses: Record<string, { stdout?: string; failed?: boolean; timedOut?: boolean }>): GitRunner {
  return async (_directory, args) => {
    const key = args.join(" ");
    const match = Object.entries(responses).find(([pattern]) => key.includes(pattern) || key === pattern);
    const response = match?.[1] ?? { failed: true };
    return {
      stdout: response.stdout ?? "",
      failed: response.failed ?? false,
      timedOut: response.timedOut ?? false,
    };
  };
}

describe("git-launch-gate", () => {
  it("normalizes worktree keys to lowercase paths", () => {
    expect(normalizeWorktreeKey("C:\\Projects\\Demo\\")).toBe("c:\\projects\\demo");
  });

  it("allows launch when no target is configured", async () => {
    const runGit = mockGit({
      "rev-parse --is-inside-work-tree": { stdout: "true\n" },
      "rev-parse --show-toplevel": { stdout: "C:\\Projects\\Demo\n" },
    });
    const result = await evaluateGitLaunchGate("C:\\Projects\\Demo", true, () => null, runGit);
    expect(result.canProceed).toBe(true);
  });

  it("allows launch when already on the target branch", async () => {
    const runGit = mockGit({
      "rev-parse --is-inside-work-tree": { stdout: "true\n" },
      "rev-parse --show-toplevel": { stdout: "C:\\Projects\\Demo\n" },
      "status --porcelain": { stdout: "" },
      "branch --show-current": { stdout: "main\n" },
    });
    const result = await evaluateGitLaunchGate("C:\\Projects\\Demo", true, () => "main", runGit);
    expect(result.canProceed).toBe(true);
  });

  it("blocks dirty switch when blockDirtyBranchSwitch is true", async () => {
    const runGit = mockGit({
      "rev-parse --is-inside-work-tree": { stdout: "true\n" },
      "rev-parse --show-toplevel": { stdout: "C:\\Projects\\Demo\n" },
      "status --porcelain": { stdout: " M README.md\n" },
      "branch --show-current": { stdout: "feature\n" },
    });
    const result = await evaluateGitLaunchGate("C:\\Projects\\Demo", true, () => "main", runGit);
    expect(result.canProceed).toBe(false);
    expect(result.message).toMatch(/uncommitted changes/i);
  });

  it("switches when clean and not on target", async () => {
    const calls: string[] = [];
    const runGit: GitRunner = async (_directory, args) => {
      const key = args.join(" ");
      calls.push(key);
      if (key.includes("is-inside-work-tree")) {
        return { stdout: "true\n", failed: false, timedOut: false };
      }
      if (key.includes("show-toplevel")) {
        return { stdout: "C:\\Projects\\Demo\n", failed: false, timedOut: false };
      }
      if (key.includes("status --porcelain")) {
        return { stdout: "", failed: false, timedOut: false };
      }
      if (key.includes("branch --show-current")) {
        return { stdout: "feature\n", failed: false, timedOut: false };
      }
      if (key.startsWith("switch ")) {
        return { stdout: "", failed: false, timedOut: false };
      }
      return { stdout: "", failed: true, timedOut: false };
    };

    const result = await evaluateGitLaunchGate("C:\\Projects\\Demo", true, () => "main", runGit);
    expect(result.canProceed).toBe(true);
    expect(calls.some((call) => call === "switch -- main")).toBe(true);
  });

  it("rejects option-like branch names", async () => {
    expect(isSafeGitBranchName("--detach")).toBe(false);
    expect(isSafeGitBranchName("main")).toBe(true);
    const switched = await switchBranch("C:\\Projects\\Demo", "--detach", async () => {
      throw new Error("should not run");
    });
    expect(switched.ok).toBe(false);
  });

  it("detects on-target branch equality", () => {
    expect(isOnTargetBranch({ branch: "main", isDirty: false, isDetached: false }, "main")).toBe(true);
    expect(isOnTargetBranch({ branch: "(detached)", isDirty: false, isDetached: true }, "main")).toBe(false);
  });
});
