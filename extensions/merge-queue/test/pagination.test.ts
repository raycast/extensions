import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchQueueResponse, QueueResponse, RawEntry } from "../src/lib/queue";

const graphql = vi.fn();

vi.mock("../src/lib/gh", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/gh")>()),
  graphql: (...args: unknown[]) => graphql(...args),
}));

const config = { ghPath: "gh", owner: "acme", name: "app" };

function check(name: string) {
  return {
    __typename: "CheckRun" as const,
    databaseId: 1,
    name,
    status: "COMPLETED",
    conclusion: "SUCCESS",
    detailsUrl: null,
    startedAt: null,
    completedAt: null,
    checkSuite: null,
  };
}

function entry(position: number, checks: string[], moreChecks: boolean): RawEntry {
  return {
    id: `entry-${position}`,
    position,
    state: "QUEUED",
    estimatedTimeToMerge: null,
    enqueuedAt: "2026-10-07T14:00:00Z",
    enqueuer: null,
    pullRequest: null,
    headCommit: {
      id: `commit-${position}`,
      statusCheckRollup: {
        contexts: { pageInfo: { hasNextPage: moreChecks, endCursor: "checks-1" }, nodes: checks.map(check) },
      },
    },
  };
}

function page(entries: RawEntry[], hasNextPage: boolean): QueueResponse {
  return {
    viewer: { login: "you" },
    repository: {
      defaultBranchRef: { name: "main" },
      mergeQueue: { url: "", entries: { pageInfo: { hasNextPage, endCursor: "entries-1" }, nodes: entries } },
    },
  };
}

beforeEach(() => {
  graphql.mockReset();
});

describe("fetchQueueResponse", () => {
  it("reads every page of entries and every page of checks", async () => {
    graphql.mockImplementation(async (_config: unknown, query: string, variables: Record<string, string>) => {
      if (query.includes("node(id: $commit)")) {
        return {
          node: {
            statusCheckRollup: {
              contexts: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [check("check 101")] },
            },
          },
        };
      }
      return variables.after
        ? page([entry(51, ["build"], false)], false)
        : page([entry(1, ["build"], true)], true);
    });

    const data = await fetchQueueResponse(config);
    const entries = data.repository!.mergeQueue!.entries.nodes;
    expect(entries.map((raw) => raw.position)).toEqual([1, 51]);
    expect(entries[0].headCommit!.statusCheckRollup!.contexts.nodes.map((node) => node && "name" in node && node.name)).toEqual([
      "build",
      "check 101",
    ]);
    expect(graphql).toHaveBeenCalledTimes(3);
  });

  it("makes one request when everything fits", async () => {
    graphql.mockResolvedValue(page([entry(1, ["build"], false)], false));
    await fetchQueueResponse(config);
    expect(graphql).toHaveBeenCalledTimes(1);
  });
});
