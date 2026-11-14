import { describe, expect, it } from "vitest";
import { CommandError } from "../src/lib/cli";
import { classifyGitHubError, GitHubUnavailableError, parseGraphQLOutput } from "../src/lib/github";

describe("parseGraphQLOutput", () => {
  it("returns successful data with no errors", () => {
    expect(parseGraphQLOutput('{"data":{"repository":{"name":"cli"}}}')).toEqual({
      data: { repository: { name: "cli" } },
      errors: [],
    });
  });

  it("preserves partial data and extracts error messages", () => {
    expect(
      parseGraphQLOutput(
        JSON.stringify({
          data: { a: { name: "cli" }, b: null },
          errors: [{ type: "NOT_FOUND", message: "Could not resolve repository." }],
        }),
      ),
    ).toEqual({
      data: { a: { name: "cli" }, b: null },
      errors: ["Could not resolve repository."],
    });
  });

  it.each([
    { label: "null data with errors", stdout: '{"data":null,"errors":[{"message":"Not found"}]}' },
    { label: "non-JSON output", stdout: "HTTP 502 Bad Gateway" },
    { label: "missing data", stdout: "{}" },
  ])("rejects $label", ({ stdout }) => {
    expect(parseGraphQLOutput(stdout)).toBeUndefined();
  });
});

describe("classifyGitHubError", () => {
  it.each([
    { label: "missing executable", stderr: "", notFound: true, reason: "NOT_INSTALLED", message: /could not run/i },
    {
      label: "signed-out CLI",
      stderr: "To get started with GitHub CLI, please run:  gh auth login",
      notFound: false,
      reason: "NOT_AUTHENTICATED",
      message: /gh auth login/i,
    },
    {
      label: "rate limiting",
      stderr: "API rate limit exceeded",
      notFound: false,
      reason: "FAILED",
      message: /rate limit/i,
    },
    {
      label: "organization SSO",
      stderr: "SAML enforcement",
      notFound: false,
      reason: "FAILED",
      message: /single sign-on|SSO/i,
    },
  ])("classifies $label", ({ stderr, notFound, reason, message }) => {
    const result = classifyGitHubError(new CommandError("Could not run command.", "", stderr, notFound));
    expect(result).toBeInstanceOf(GitHubUnavailableError);
    expect(result).toMatchObject({ reason });
    expect(result.message).toMatch(message);
  });

  it("does not classify authentication text in PR content as an auth failure", () => {
    const result = classifyGitHubError(
      new CommandError("HTTP 502", '{"title":"Fix authentication"}', "HTTP 502", false),
    );
    expect(result).toBeInstanceOf(GitHubUnavailableError);
    expect(result).toMatchObject({ reason: "FAILED" });
  });

  it("returns a plain Error unchanged", () => {
    const error = new Error("Unexpected CLI failure.");
    expect(classifyGitHubError(error)).toBe(error);
  });
});
