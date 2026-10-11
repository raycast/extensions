import { describe, expect, it } from "vitest";
import { describeError, logErrorMessage } from "../src/lib/errors";
import { classifyGhMessage, GhError, needsSignIn, ssoUrl } from "../src/lib/gh";
import { terminalScript } from "../src/lib/terminal-script";
import { parseQueue } from "../src/lib/queue";

describe("classifyGhMessage, with messages gh really prints", () => {
  it.each([
    ["Could not resolve to a Repository with the name 'nope-owner-xyz/nope'.", "not-found"],
    ["Not Found (HTTP 404)", "not-found"],
    ["Bad credentials (HTTP 401)", "expired"],
    [
      "GraphQL: Resource protected by organization SAML enforcement. You must grant your OAuth token access to this organization. (repository)",
      "sso",
    ],
    ["To get started with GitHub CLI, please run:  gh auth login", "unauthenticated"],
    [
      'Get "https://api.github.com/user": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused',
      "offline",
    ],
    ["error connecting to api.github.com\ncheck your internet connection", "offline"],
    ["API rate limit exceeded for user ID 1. (HTTP 403)", "rate-limited"],
    ["Must have admin rights to Repository. (HTTP 403)", "forbidden"],
    ["Gone (HTTP 410)", "gone"],
    ["something unexpected", "other"],
  ])("%s → %s", (message, kind) => expect(classifyGhMessage(message)).toBe(kind));
});

describe("ssoUrl", () => {
  it("pulls GitHub's authorization link out of the message", () =>
    expect(ssoUrl("Visit https://github.com/orgs/acme/sso?authorization_request=abc123 to authorize")).toBe(
      "https://github.com/orgs/acme/sso?authorization_request=abc123",
    ));
  it("is undefined without one", () => expect(ssoUrl("Resource protected by SAML enforcement")).toBeUndefined());
});

describe("describeError", () => {
  it("tells you to install gh and copies the command", () => {
    const advice = describeError(new GhError("GitHub CLI not found at /opt/homebrew/bin/gh", "missing"));
    expect([advice.title, advice.command, advice.canSwitch]).toEqual([
      "GitHub CLI isn't installed",
      "brew install gh && gh auth login --hostname github.com --git-protocol https --web --clipboard",
      false,
    ]);
  });

  it("names the repository it can't see and offers to switch", () => {
    const advice = describeError(new GhError("x", "not-found", { repo: "acme/web" }));
    expect([advice.title, advice.command, advice.canSwitch]).toEqual(["Can't see acme/web", "gh auth status", true]);
  });

  it("explains a missing merge queue with the branch it checked", () => {
    const data = { viewer: { login: "you" }, repository: { defaultBranchRef: { name: "main" }, mergeQueue: null } };
    let error: unknown;
    try {
      parseQueue({ owner: "acme", name: "web" }, data, []);
    } catch (caught) {
      error = caught;
    }
    const advice = describeError(error);
    expect(advice.title).toBe("acme/web has no merge queue");
    expect(advice.description).toContain("on main");
    expect(advice.canSwitch).toBe(true);
  });

  it("asks you to sign in again when the token expired", () => {
    const advice = describeError(new GhError("Bad credentials (HTTP 401)", "expired"));
    expect([advice.title, advice.command]).toEqual([
      "GitHub CLI sign-in expired",
      "gh auth login --hostname github.com --git-protocol https --web --clipboard",
    ]);
  });

  it("sends you to authorize single sign-on, with GitHub's link when it gives one", () => {
    const url = "https://github.com/orgs/acme/sso?authorization_request=abc123";
    const withLink = describeError(new GhError("SAML enforcement", "sso", { repo: "acme/web", url }));
    expect([withLink.title, withLink.url, withLink.command]).toEqual([
      "Authorize gh for acme's single sign-on",
      url,
      "gh auth refresh --hostname github.com",
    ]);
    expect(describeError(new GhError("SAML enforcement", "sso")).description).toMatch(/Refresh gh's sign-in/);
  });

  it("knows which errors are fixed by signing in", () => {
    expect(
      ["missing", "unauthenticated", "expired", "sso"].every((kind) => needsSignIn(new GhError("x", kind as never))),
    ).toBe(true);
    expect(needsSignIn(new GhError("x", "offline"))).toBe(false);
  });

  it("keeps the raw message for anything unrecognized", () =>
    expect(describeError(new Error("boom")).description).toBe("boom"));
});

describe("logErrorMessage", () => {
  it("explains expired logs", () =>
    expect(logErrorMessage(new GhError("Not Found (HTTP 404)", "not-found"))).toMatch(/isn't available anymore/));
  it("explains being offline", () =>
    expect(logErrorMessage(new GhError("dial tcp", "offline"))).toMatch(/^Can't reach GitHub\./));
});

describe("terminalScript", () => {
  it("runs the command in a login shell and says what it ran", () => {
    const script = terminalScript("gh auth login --web");
    expect(script.split("\n")[0]).toBe("#!/bin/zsh -l");
    expect(script).toContain('echo "Running: gh auth login --web"');
    expect(script).toContain("\ngh auth login --web\n");
  });
});
