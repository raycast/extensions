import { beforeEach, describe, expect, it, vi } from "vitest";

const mergeability = vi.hoisted(() => ({ value: "NEEDS_APPROVALS" as string | undefined }));

const stack = vi.hoisted(() => ({
  pullRequests: [
    { number: 481, title: "Extract pricing table", baseRefName: "main" },
    { number: 482, title: "Add billing page", baseRefName: "pricing" },
  ],
}));

vi.mock("../src/lib/merge-plan", () => ({
  mergeabilityOf: vi.fn(async () => mergeability.value),
  planMerge: vi.fn(async () => ({ trunk: "main", pullRequests: stack.pullRequests })),
}));
vi.mock("../src/lib/api", () => ({
  mergeWithGraphite: vi.fn(async () => undefined),
  graphiteAppUrl: vi.fn(async () => "https://app.graphite.com"),
  graphitePullRequestUrl: (app: string, owner: string, repo: string, n: number) =>
    `${app}/github/pr/${owner}/${repo}/${n}`,
  gitHubPullRequestUrl: (owner: string, repo: string, n: number) => `https://github.com/${owner}/${repo}/pull/${n}`,
}));
vi.mock("../src/lib/github", () => ({
  fetchDetails: vi.fn(async () => ({ title: "Add billing page" })),
  submitReview: vi.fn(async () => undefined),
}));

import { mergeWithGraphite } from "../src/lib/api";
import { submitReview } from "../src/lib/github";
import mergeTool, { confirmation as confirmMerge } from "../src/tools/merge-pull-request";
import reviewTool, { confirmation as confirmReview } from "../src/tools/review-pull-request";

beforeEach(() => vi.clearAllMocks());

describe("merge-pull-request", () => {
  const input = { pullRequest: "acme/web#482" };

  it("never merges without a confirmation, even if the pull request becomes ready in between", async () => {
    mergeability.value = "NEEDS_APPROVALS";
    expect(await confirmMerge(input)).toBeUndefined();
    mergeability.value = "READY_TO_MERGE";
    const result = await mergeTool(input);
    expect(result.merged).toBe(false);
    expect(mergeWithGraphite).not.toHaveBeenCalled();
  });

  it("confirms the whole stack, then merges it bottom first", async () => {
    mergeability.value = "READY_TO_MERGE";
    const confirmation = await confirmMerge(input);
    expect(confirmation?.message).toBe("Merge 2 pull requests into main with Graphite?");
    expect(confirmation?.info?.map((row) => row.name)).toEqual(["1. #481", "2. #482", "Into", "How"]);
    const result = await mergeTool(input);
    expect(result).toMatchObject({
      merged: true,
      pullRequests: [{ number: 481, url: "https://app.graphite.com/github/pr/acme/web/481" }, { number: 482 }],
    });
    expect(mergeWithGraphite).toHaveBeenCalledWith("acme", "web", "main", [481, 482]);
  });

  it("refuses when the pull request stopped being ready after the confirmation", async () => {
    mergeability.value = "READY_TO_MERGE";
    await confirmMerge(input);
    mergeability.value = "FAILING_REQUIRED";
    expect(await mergeTool(input)).toMatchObject({ merged: false, reason: expect.stringMatching(/Failing required/) });
    expect(mergeWithGraphite).not.toHaveBeenCalled();
  });

  it("refuses when the stack changed after the confirmation", async () => {
    mergeability.value = "READY_TO_MERGE";
    await confirmMerge(input);
    const confirmed = stack.pullRequests;
    stack.pullRequests = [{ number: 480, title: "Add pricing API", baseRefName: "main" }, ...confirmed];
    try {
      expect(await mergeTool(input)).toMatchObject({ merged: false, reason: expect.stringMatching(/changed/) });
    } finally {
      stack.pullRequests = confirmed;
    }
    expect(mergeWithGraphite).not.toHaveBeenCalled();
  });
});

describe("review-pull-request", () => {
  it("requires a body for comments and change requests", async () => {
    await expect(confirmReview({ pullRequest: "acme/web#482", action: "comment" })).rejects.toThrow(/needs a body/);
    await expect(reviewTool({ pullRequest: "acme/web#482", action: "request-changes", body: " " })).rejects.toThrow();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("shows what will be posted, then submits it", async () => {
    const confirmation = await confirmReview({ pullRequest: "acme/web#482", action: "approve", body: "LGTM" });
    expect(confirmation?.info).toContainEqual({ name: "Comment", value: "LGTM" });
    await reviewTool({ pullRequest: "https://github.com/acme/web/pull/482", action: "approve", body: "LGTM" });
    expect(submitReview).toHaveBeenCalledWith({ owner: "acme", repo: "web", number: 482 }, "approve", "LGTM");
  });
});
