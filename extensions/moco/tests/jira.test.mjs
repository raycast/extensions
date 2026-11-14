import assert from "node:assert/strict";
import test from "node:test";
import { decodeSafariTab, extractJiraIssue, jiraActivityLink } from "../src/utils/jira.ts";

const ticket = (url, title = "[PROJ-123] Fix sign-in — Jira", domains = "") =>
  extractJiraIssue({ url, title }, domains);

test("direct issue: prefill key, summary and canonical link without transient URL data", () => {
  assert.deepEqual(ticket("https://example.atlassian.net/browse/PROJ-123?session_id=temporary#comment-1"), {
    key: "PROJ-123",
    summary: "Fix sign-in",
    url: "https://example.atlassian.net/browse/PROJ-123",
    description: "#PROJ-123 Fix sign-in",
  });
});

test("Jira software board: use the selected issue, not the board's project or title", () => {
  assert.equal(
    ticket(
      "https://example.atlassian.net/jira/software/c/projects/OTHER/boards/248?selectedIssue=PROJ-123",
      "OTHER board - Jira",
    ).description,
    "#PROJ-123",
  );
});

test("issue navigator supports issueKey", () => {
  assert.equal(ticket("https://example.atlassian.net/issues/?issueKey=PROJ-123").key, "PROJ-123");
});

test("the explicitly selected issue takes precedence over a background issue URL", () => {
  const issue = ticket("https://example.atlassian.net/browse/PROJ-100?selectedIssue=PROJ-123");
  assert.equal(issue.key, "PROJ-123");
  assert.equal(issue.url, "https://example.atlassian.net/browse/PROJ-123");
});

test("self-hosted Jira preserves its context path", () => {
  assert.equal(
    ticket("https://jira.example.org/company/browse/PROJ-123", undefined, "jira.example.org").url,
    "https://jira.example.org/company/browse/PROJ-123",
  );
});

test("self-hosted boards preserve their context path", () => {
  assert.equal(
    ticket(
      "https://jira.example.org/company/secure/RapidBoard.jspa?rapidView=1&selectedIssue=PROJ-123",
      undefined,
      "jira.example.org",
    ).url,
    "https://jira.example.org/company/browse/PROJ-123",
  );
});

test("explicit domain lists accept hostnames or pasted site URLs, matching exact hosts", () => {
  const issue = ticket(
    "https://example.atlassian.net/browse/PROJ-123",
    undefined,
    "https://other.atlassian.net, EXAMPLE.atlassian.net",
  );
  assert.equal(issue.key, "PROJ-123");
  assert.throws(
    () => ticket("https://third.atlassian.net/browse/PROJ-123", undefined, "example.atlassian.net"),
    /allowed Jira domain/,
  );
});

test("normalizes lower-case issue keys", () => {
  assert.equal(ticket("https://example.atlassian.net/browse/proj-123").key, "PROJ-123");
});

for (const title of [
  "PROJ-123: Fix sign-in - Jira",
  "PROJ-123 - Fix sign-in | Jira",
  "Fix sign-in - PROJ-123 - Jira",
  "[PROJ-123] Fix sign-in - Atlassian Jira",
]) {
  test(`extracts a reliable summary from ${JSON.stringify(title)}`, () => {
    assert.equal(ticket("https://example.atlassian.net/browse/PROJ-123", title).summary, "Fix sign-in");
  });
}

test("does not use an unrelated page title as the issue summary", () => {
  assert.equal(
    ticket("https://example.atlassian.net/browse/PROJ-123", "[PROJ-999] Different issue - Jira").summary,
    "",
  );
});

test("titles remain literal text even if they contain code-like or instruction-like strings", () => {
  const issue = ticket(
    "https://example.atlassian.net/browse/PROJ-123",
    '[PROJ-123] Fix $(touch /tmp/never-run) `code` "quotes" - Jira',
  );
  assert.match(issue.description, /\$\(touch \/tmp\/never-run\)/);
  assert.match(issue.description, /`code` "quotes"/);
});

test("normalizes control characters in tab titles", () => {
  assert.equal(
    ticket("https://example.atlassian.net/browse/PROJ-123", "[PROJ-123]\nFix\u0000 sign-in - Jira").summary,
    "Fix sign-in",
  );
});

for (const url of [
  "about:blank",
  "http://example.atlassian.net/browse/PROJ-123",
  "https://user:password@example.atlassian.net/browse/PROJ-123",
  "https://example.atlassian.net:8443/browse/PROJ-123",
  "https://example.atlassian.net.evil.test/browse/PROJ-123",
  "https://example.org/browse/PROJ-123",
  "https://example.atlassian.net/wiki/spaces/TEAM?selectedIssue=PROJ-123",
  "https://example.atlassian.net/jira/software/c/projects/PROJ/boards/1",
  "https://example.atlassian.net/browse/PROJ-0",
  "https://example.atlassian.net/browse/%E0%A4%A",
  "https://example.atlassian.net/browse/PROJ-123?selectedIssue=PROJ-123&selectedIssue=PROJ-124",
  "https://example.atlassian.net/issues/?issueKey=PROJ-123&selectedIssue=PROJ-124",
  "https://example.atlassian.net/issues/?selectedIssue=%3Cscript%3E",
]) {
  test(`refuses an unsupported or ambiguous Jira reference: ${url}`, () => {
    assert.throws(() => ticket(url));
  });
}

test("Safari JSON preserves quotes, newlines and unicode without delimiter ambiguity", () => {
  const original = {
    url: "https://example.atlassian.net/browse/PROJ-123",
    title: 'Title "with quotes", commas, ü\nand newlines',
  };
  assert.deepEqual(decodeSafariTab(JSON.stringify(original)), original);
});

for (const value of ["not JSON", "null", "[]", "{}", '{"url":1,"title":"title"}', '{"url":"https://example.org"}']) {
  test(`rejects malformed Safari output: ${value}`, () => {
    assert.throws(() => decodeSafariTab(value));
  });
}

test("requested description preserves the full summary and attaches a native MOCO ticket link", () => {
  const summary = "[FE | E2E] CI – Run smoke tests before merging a pull request";
  const issue = ticket("https://your-team.atlassian.net/browse/PROJ-123?source=board", `[PROJ-123] ${summary} - Jira`);
  assert.equal(issue.description, `#PROJ-123 ${summary}`);
  assert.deepEqual(jiraActivityLink(issue), {
    remote_service: "jira",
    remote_id: "PROJ-123",
    remote_url: "https://your-team.atlassian.net/browse/PROJ-123",
  });
  assert.equal(issue.description.includes("https://"), false);
});
