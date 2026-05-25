import { test } from "node:test";
import * as assert from "node:assert/strict";
import { formatBytes, htmlToMarkdown } from "../src/utils/detail";

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
