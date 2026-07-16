import { describe, expect, it } from "vitest";
import { readRepositoryGitInfo, type GitRunner } from "../../src/git/info";
import { err, ok, type Result } from "../../src/utils/result";

/** Build a fake git runner from a map of "first arg" → stdout (or Error). */
function fakeRunner(responses: Record<string, string | Error>): GitRunner {
  return async (args): Promise<Result<string, Error>> => {
    const key = args[0] ?? "";
    const response = responses[key];
    if (response === undefined) {
      return err(new Error(`unexpected git ${args.join(" ")}`));
    }
    return response instanceof Error ? err(response) : ok(response);
  };
}

describe("readRepositoryGitInfo", () => {
  it("parses a clean repository with a remote and last commit", async () => {
    const runner = fakeRunner({
      "rev-parse": "main",
      status: "",
      config: "git@github.com:owner/repo.git",
      log: "1700000000",
    });
    const info = await readRepositoryGitInfo("/repo", "normal", { runner });
    expect(info).toEqual({
      branch: "main",
      status: "clean",
      remoteUrl: "git@github.com:owner/repo.git",
      remoteWebUrl: "https://github.com/owner/repo",
      lastCommitAt: 1700000000,
    });
  });

  it("detects a dirty working tree", async () => {
    const runner = fakeRunner({
      "rev-parse": "feature",
      status: " M src/index.ts\n?? new.ts",
      config: "",
      log: "",
    });
    const info = await readRepositoryGitInfo("/repo", "normal", { runner });
    expect(info.status).toBe("dirty");
    expect(info.branch).toBe("feature");
    expect(info.remoteUrl).toBeNull();
    expect(info.lastCommitAt).toBeNull();
  });

  it("treats a detached HEAD as a null branch", async () => {
    const runner = fakeRunner({ "rev-parse": "HEAD", status: "", config: "", log: "" });
    const info = await readRepositoryGitInfo("/repo", "normal", { runner });
    expect(info.branch).toBeNull();
  });

  it("reports unknown status for bare repositories without running status", async () => {
    let statusCalls = 0;
    const runner: GitRunner = async (args) => {
      if (args[0] === "status") {
        statusCalls++;
      }
      if (args[0] === "rev-parse") return ok("main");
      return ok("");
    };
    const info = await readRepositoryGitInfo("/repo.git", "bare", { runner });
    expect(info.status).toBe("unknown");
    expect(statusCalls).toBe(0);
  });

  it("degrades gracefully when git commands fail", async () => {
    const runner = fakeRunner({
      "rev-parse": new Error("not a git repository"),
      status: new Error("fail"),
      config: new Error("fail"),
      log: new Error("fail"),
    });
    const info = await readRepositoryGitInfo("/broken", "normal", { runner });
    expect(info).toEqual({
      branch: null,
      status: "unknown",
      remoteUrl: null,
      remoteWebUrl: null,
      lastCommitAt: null,
    });
  });

  it("ignores non-numeric commit timestamps", async () => {
    const runner = fakeRunner({ "rev-parse": "main", status: "", config: "", log: "garbage" });
    const info = await readRepositoryGitInfo("/repo", "normal", { runner });
    expect(info.lastCommitAt).toBeNull();
  });
});
