import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeMarkdown,
  formatRelativeTime,
  hostnameOf,
  noteToMarkdown,
  toOpenableUrl,
  websiteIconUrl,
} from "./format";

test("shows the hostname of a URL without www", () => {
  assert.equal(hostnameOf("https://www.example.com/login?next=/"), "example.com");
  assert.equal(hostnameOf("https://app.example.org"), "app.example.org");
  assert.equal(hostnameOf("example.com"), "example.com");
});

test("adds a scheme to URLs saved without one", () => {
  assert.equal(toOpenableUrl("example.com/login"), "https://example.com/login");
  assert.equal(toOpenableUrl("http://example.com"), "http://example.com");
  assert.equal(toOpenableUrl("ssh://example.com"), "ssh://example.com");
});

test("formats modification dates relative to now", () => {
  const now = Date.parse("2026-06-15T12:00:00Z");
  assert.equal(formatRelativeTime("2026-03-15T12:00:00Z", now), "3 months ago");
  assert.equal(formatRelativeTime("2026-06-14T12:00:00Z", now), "yesterday");
  assert.equal(formatRelativeTime("2026-06-15T11:59:30Z", now), "just now");
  assert.equal(formatRelativeTime("2026-06-15T13:00:00Z", now), "just now");
  assert.equal(formatRelativeTime("not a date", now), undefined);
});

test("leaves URLs and plain text untouched when escaping markdown", () => {
  assert.equal(escapeMarkdown("https://example.com/path-to-page"), "https://example.com/path-to-page");
  assert.equal(escapeMarkdown("Example Inc."), "Example Inc.");
});

test("escapes characters that would change the markdown rendering", () => {
  assert.equal(escapeMarkdown("a*b_c`d"), "a\\*b\\_c\\`d");
  assert.equal(escapeMarkdown("# Title\n- item\n> quote\n12. step"), "\\# Title\n\\- item\n\\> quote\n12\\. step");
  assert.equal(escapeMarkdown("[link](https://example.com)"), "\\[link\\](https://example.com)");
});

test("keeps the line breaks of notes", () => {
  assert.equal(noteToMarkdown("first line\nsecond line\r\nthird line"), "first line  \nsecond line  \nthird line");
});

test("builds website icon URLs from the hostname only", () => {
  assert.equal(
    websiteIconUrl("https://www.example.com/login?next=/"),
    "https://icons.duckduckgo.com/ip3/www.example.com.ico",
  );
  assert.equal(websiteIconUrl("example.org"), "https://icons.duckduckgo.com/ip3/example.org.ico");
  assert.equal(websiteIconUrl("not a url"), undefined);
});
