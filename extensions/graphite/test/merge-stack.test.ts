import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runGh } from "../src/lib/cli";
import {
  DownstackSource,
  findDownstack,
  PullRequestRef,
  StackPullRequest,
  StackWalkError,
  walkDownstack,
} from "../src/lib/github";
import { readGraphiteTrunks } from "../src/lib/repositories";

// Fail closed: no test may invoke the real CLI, network, or user configuration.
vi.mock("../src/lib/cli", () => ({ runGh: vi.fn(), CommandError: class extends Error {} }));

const ref = { owner: "example", repo: "project", number: 3 };
const pr = (number: number, baseRefName: string): StackPullRequest => ({ number, title: `PR ${number}`, baseRefName });
function source(
  pullRequest: StackPullRequest | undefined,
  parents: Record<string, StackPullRequest[]> = {},
  defaultBranch = "main",
): DownstackSource {
  return {
    start: async () => ({ defaultBranch, pullRequest }),
    openPullRequestsWithHead: vi.fn(async (_ref: PullRequestRef, branch: string) => parents[branch] ?? []),
  };
}
function chain(length: number): DownstackSource {
  const parents: Record<string, StackPullRequest[]> = {};
  for (let number = 1; number < length; number++) {
    parents[`feature-${number}`] = [pr(number, number === 1 ? "main" : `feature-${number - 1}`)];
  }
  return source(pr(length, `feature-${length - 1}`), parents);
}

afterEach(() => vi.clearAllMocks());

describe("walkDownstack", () => {
  it("keeps a single PR on the default branch", async () => {
    const selected = pr(3, "default");
    expect(await walkDownstack(ref, source(selected, {}, "default"))).toEqual({
      trunk: "default",
      pullRequests: [selected],
    });
  });

  it("orders a three-level stack bottom to top", async () => {
    expect(await walkDownstack(ref, chain(3))).toEqual({
      trunk: "main",
      pullRequests: [pr(1, "main"), pr(2, "feature-1"), pr(3, "feature-2")],
    });
  });

  it("maps a temporary Graphite base to the default branch", async () => {
    const selected = pr(3, "graphite-base/123");
    expect(await walkDownstack(ref, source(selected, {}, "default"))).toEqual({
      trunk: "default",
      pullRequests: [selected],
    });
  });

  it.each([{ knownTrunks: ["develop"] }, { knownTrunks: [] }])(
    "does not include a develop release PR with $knownTrunks",
    async ({ knownTrunks }) => {
      const selected = pr(3, "develop");
      const data = source(selected, { develop: [pr(1, "main")] });
      expect(await walkDownstack(ref, data, knownTrunks)).toEqual({ trunk: "develop", pullRequests: [selected] });
      expect(data.openPullRequestsWithHead).not.toHaveBeenCalled();
    },
  );

  it("stops at a custom configured trunk even with an open release PR", async () => {
    const selected = pr(3, "integration");
    expect(await walkDownstack(ref, source(selected, { integration: [pr(1, "main")] }), ["integration"])).toEqual({
      trunk: "integration",
      pullRequests: [selected],
    });
  });

  it("stops at release branches", async () => {
    const selected = pr(3, "release/2026");
    expect(await walkDownstack(ref, source(selected, { "release/2026": [pr(1, "main")] }))).toEqual({
      trunk: "release/2026",
      pullRequests: [selected],
    });
  });

  it("allows an unknown base with no open PR", async () => {
    expect(await walkDownstack(ref, source(pr(3, "custom")))).toEqual({
      trunk: "custom",
      pullRequests: [pr(3, "custom")],
    });
  });

  it("rejects multiple same-repository parents", async () => {
    const walk = walkDownstack(ref, source(pr(3, "feature"), { feature: [pr(1, "main"), pr(2, "main")] }));
    await expect(walk).rejects.toBeInstanceOf(StackWalkError);
    await expect(walk).rejects.toThrow("More than one open pull request uses the branch feature.");
  });

  it("rejects a cycle", async () => {
    await expect(walkDownstack(ref, source(pr(3, "feature"), { feature: [pr(3, "feature")] }))).rejects.toThrow(
      new StackWalkError("The stack loops back on itself. Merge it in Graphite instead."),
    );
  });

  it("allows exactly 25 PRs", async () => {
    const result = await walkDownstack({ ...ref, number: 25 }, chain(25));
    expect(result.trunk).toBe("main");
    expect(result.pullRequests.map((item) => item.number)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it("rejects a 26-deep stack instead of returning a PR branch as trunk", async () => {
    await expect(walkDownstack({ ...ref, number: 26 }, chain(26))).rejects.toThrow(
      new StackWalkError("This stack is deeper than 25 pull requests. Merge it in Graphite instead."),
    );
  });

  it("rejects a missing starting PR", async () => {
    await expect(walkDownstack(ref, source(undefined))).rejects.toThrow(
      new StackWalkError("Couldn't find #3 on GitHub."),
    );
  });
});

describe("GitHub stack source", () => {
  it("excludes fork parents and requests enough candidates to detect ambiguity", async () => {
    vi.mocked(runGh)
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          data: {
            repository: {
              defaultBranchRef: { name: "main" },
              pullRequest: pr(3, "feature"),
            },
          },
        }),
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          data: {
            repository: {
              pullRequests: {
                nodes: [
                  { ...pr(99, "other"), isCrossRepository: true },
                  { ...pr(1, "main"), isCrossRepository: false },
                ],
              },
            },
          },
        }),
        stderr: "",
      });
    expect(await findDownstack(ref)).toEqual({ trunk: "main", pullRequests: [pr(1, "main"), pr(3, "feature")] });
    expect(vi.mocked(runGh).mock.calls[1]?.[0]?.join(" ")).toContain("first: 5");
  });
});

describe("readGraphiteTrunks", () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });
  async function repository(config?: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), "graphite-merge-stack-"));
    directories.push(directory);
    await mkdir(join(directory, ".git"));
    if (config !== undefined) await writeFile(join(directory, ".git", ".graphite_repo_config"), config);
    return directory;
  }

  it("combines and deduplicates trunk and trunks", async () => {
    expect(
      await readGraphiteTrunks(
        await repository(
          JSON.stringify({
            trunk: "main",
            trunks: [{ name: "main" }, { name: "integration" }],
            unrelated: true,
          }),
        ),
      ),
    ).toEqual(["main", "integration"]);
  });
  it("supports legacy trunk-only configuration", async () => {
    expect(await readGraphiteTrunks(await repository('{"trunk":"main"}'))).toEqual(["main"]);
  });
  it("supports trunks-only configuration", async () => {
    expect(await readGraphiteTrunks(await repository('{"trunks":[{"name":"integration"}]}'))).toEqual(["integration"]);
  });
  it("returns an empty list for malformed JSON", async () => {
    expect(await readGraphiteTrunks(await repository("{"))).toEqual([]);
  });
  it("returns an empty list for an invalid schema", async () => {
    expect(await readGraphiteTrunks(await repository('{"trunk":123}'))).toEqual([]);
  });
  it("returns an empty list for a missing file", async () => {
    expect(await readGraphiteTrunks(await repository())).toEqual([]);
  });
});
