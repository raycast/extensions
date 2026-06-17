import { test } from "node:test";
import * as assert from "node:assert/strict";
import { formatBytes, htmlToMarkdown, notesBlock } from "../src/utils/detail";
import type { UpdateInfo } from "../src/utils/types";

// Minimal UpdateInfo factory for notesBlock tests.
function info(over: Partial<UpdateInfo>): UpdateInfo {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app: { name: "X", version: "1.0" } as any,
    source: "github",
    latestVersion: "2.0",
    hasUpdate: true,
    checkedAt: 0,
    ...over,
  };
}

test("htmlToMarkdown handles common Sparkle release-note tags", () => {
  const html = "<p>Hello <strong>world</strong>.</p><ul><li>One</li><li>Two</li></ul>";
  const md = htmlToMarkdown(html);
  assert.ok(md.includes("Hello **world**."));
  assert.ok(md.includes("- One"));
  assert.ok(md.includes("- Two"));
});

test("htmlToMarkdown converts links", () => {
  const md = htmlToMarkdown('<a href="https://example.com">click</a>');
  assert.equal(md, "[click](https://example.com)");
});

test("htmlToMarkdown decodes entities", () => {
  assert.equal(htmlToMarkdown("Tom &amp; Jerry"), "Tom & Jerry");
  assert.equal(htmlToMarkdown("&lt;tag&gt;"), "<tag>");
  assert.equal(htmlToMarkdown("&quot;quoted&quot;"), '"quoted"');
});

test("htmlToMarkdown collapses excess blank lines", () => {
  const md = htmlToMarkdown("<p>One</p><p></p><p></p><p>Two</p>");
  assert.ok(!md.includes("\n\n\n"), "no more than two consecutive newlines");
});

test("htmlToMarkdown handles headers h1-h6", () => {
  for (let i = 1; i <= 6; i++) {
    const md = htmlToMarkdown(`<h${i}>Hello</h${i}>`);
    assert.ok(md.includes(`${"#".repeat(i)} Hello`));
  }
});

test("formatBytes scales to human-readable units", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
  assert.equal(formatBytes(2 * 1024 * 1024 * 1024), "2.00 GB");
});

test("notesBlock prefers inline Markdown (GitHub body) and links to full notes", () => {
  const out = notesBlock(
    info({
      source: "github",
      releaseNotesMarkdown: "## Fixes\n- Crash on launch",
      releaseNotesUrl: "https://github.com/o/r/releases/tag/v2.0",
    }),
  ).join("\n");
  assert.ok(out.includes("What's new in 2.0"));
  assert.ok(out.includes("Crash on launch"));
  assert.ok(out.includes("Read the full release notes →"));
});

test("notesBlock renders Sparkle HTML and App Store plain text", () => {
  const html = notesBlock(
    info({ source: "sparkle", releaseNotesHtml: "<p>Hi <b>there</b></p>" }),
  ).join("\n");
  assert.ok(html.includes("Hi **there**"));

  const text = notesBlock(
    info({ source: "mas", releaseNotesText: "Line one\nLine two" }),
  ).join("\n");
  // plain-text newlines become Markdown hard breaks
  assert.ok(text.includes("Line one  \nLine two"));
});

test("notesBlock gives a graceful, source-aware pointer when there are no notes", () => {
  const mas = notesBlock(
    info({ source: "mas", releaseNotesUrl: "https://apps.apple.com/app/id1" }),
  ).join("\n");
  assert.ok(/App Store/i.test(mas));
  assert.ok(mas.includes("apps.apple.com"));

  const brew = notesBlock(
    info({ source: "homebrew-cask", releaseNotesUrl: "https://example.com" }),
  ).join("\n");
  assert.ok(/Homebrew doesn't carry release notes/i.test(brew));

  const none = notesBlock(info({ source: "github" })).join("\n");
  assert.ok(/No release notes available/i.test(none));
});

test("notesBlock truncates very long notes and still links out", () => {
  const big = "x".repeat(9000);
  const out = notesBlock(
    info({
      source: "github",
      releaseNotesMarkdown: big,
      releaseNotesUrl: "https://github.com/o/r",
    }),
  ).join("\n");
  assert.ok(out.length < 5000);
  assert.ok(out.includes("…"));
  assert.ok(out.includes("Read the full release notes →"));
});
