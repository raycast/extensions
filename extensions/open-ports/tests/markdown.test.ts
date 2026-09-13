import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeInline, fencedCodeBlock } from "../src/core/markdown";

describe("fencedCodeBlock", () => {
  it("uses a three-backtick fence for ordinary content", () => {
    assert.equal(fencedCodeBlock("/usr/bin/node server.js"), "```\n/usr/bin/node server.js\n```");
  });

  // A process name is chosen by whoever started the process, so it is untrusted text.
  it("grows the fence so content cannot escape the code block", () => {
    const hostile = "```\n# Injected heading";
    const block = fencedCodeBlock(hostile);

    assert.ok(block.startsWith("````\n"));
    assert.ok(block.endsWith("\n````"));
    assert.ok(block.includes(hostile));
  });
});

describe("escapeInline", () => {
  it("escapes the characters that would restyle surrounding text", () => {
    assert.equal(escapeInline("a*b"), "a\\*b");
    assert.equal(escapeInline("[link](url)"), "\\[link\\]\\(url\\)");
    assert.equal(escapeInline("plain"), "plain");
  });
});
