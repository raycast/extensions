import assert from "node:assert/strict";
import { test } from "node:test";
import { detectInput, normalizePostUrl } from "../src/lib/input";

test("normalizes supported status URLs without tracking queries", () => {
  for (const input of [
    "https://x.com/jack/status/20?s=20",
    "https://twitter.com/jack/status/20/photo/1",
    "https://mobile.twitter.com/i/web/status/20",
    "https://x.com/i/status/20",
  ]) {
    assert.equal(normalizePostUrl(input), "https://x.com/i/status/20");
  }
});

test("rejects ambiguous, credentialed, non-public, and unsupported URLs", () => {
  for (const url of [
    "http://x.com/jack/status/20",
    "https://x.com.evil.test/jack/status/20",
    "https://x.com@127.0.0.1/jack/status/20",
    "https://user@x.com/jack/status/20",
    "https://x.com:8080/jack/status/20",
    "https://x.com/jack",
    "https://127.0.0.1/status/20",
    "https://example.com",
    "x.com/jack/status/20",
  ]) {
    assert.throws(() => detectInput(url), undefined, url);
  }
});

test("preserves plain text verbatim and accepts only Post-shaped JSON", () => {
  assert.deepEqual(detectInput("  My link: https://example.com\n"), {
    type: "post",
    post: { text: "  My link: https://example.com\n" },
  });
  assert.deepEqual(detectInput('{"text":"hi","poll":{"choices":["Yes","No"]}}'), {
    type: "post",
    post: { text: "hi", poll: { choices: ["Yes", "No"] } },
  });
  for (const invalid of ["", " ", "[]", "{broken", '{"text":12}', '{"post":{"text":"hi"}}'])
    assert.throws(() => detectInput(invalid));
});
