import { describe, expect, it } from "vitest";
import { parsePullRequestInput, requirePullRequest } from "../src/lib/pull-request-input";

describe("parsePullRequestInput", () => {
  const ref = { owner: "acme", repo: "web.app", number: 482 };
  it.each([
    "acme/web.app#482",
    "  acme/web.app#482 ",
    "https://github.com/acme/web.app/pull/482",
    "github.com/acme/web.app/pull/482/files",
    "https://github.com/acme/web.app/pull/482#discussion_r1",
    "https://app.graphite.com/github/pr/acme/web.app/482",
    "https://app.graphite.com/github/pr/acme/web.app/482/Add-billing-page?panel=files",
    "https://app.graphite.dev/github/pr/acme/web.app/482",
  ])("parses %s", (text) => expect(parsePullRequestInput(text)).toEqual(ref));

  it.each(["482", "#482", "acme/web#abc", "https://gitlab.com/acme/web/-/merge_requests/1", "Add billing page"])(
    "rejects %s",
    (text) => expect(parsePullRequestInput(text)).toBeUndefined(),
  );

  it("explains the accepted formats when the reference is invalid", () => {
    expect(() => requirePullRequest("billing PR")).toThrow(/owner\/repo#number/);
  });
});
