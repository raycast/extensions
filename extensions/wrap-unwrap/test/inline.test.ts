// test/inline.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { protectInline, restoreInline } from "../src/lib/inline.js";

test("protectInline replaces inline code spans with placeholders", () => {
  const { protected: p, tokens } = protectInline("foo `bar baz` qux");
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "`bar baz`");
  // placeholder format must contain no spaces, so reflow won't split it
  assert.ok(!p.includes(" bar baz "));
  assert.equal(restoreInline(p, tokens), "foo `bar baz` qux");
});

test("protectInline handles double-backtick spans", () => {
  const { protected: p, tokens } = protectInline("see ``a `b` c`` here");
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "``a `b` c``");
  assert.equal(restoreInline(p, tokens), "see ``a `b` c`` here");
});

test("protectInline replaces inline links", () => {
  const { protected: p, tokens } = protectInline("see [the docs](https://example.com/a b) now");
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "[the docs](https://example.com/a b)");
  assert.equal(restoreInline(p, tokens), "see [the docs](https://example.com/a b) now");
});

test("protectInline replaces reference links", () => {
  const { protected: p, tokens } = protectInline("see [the docs][docs-id] now");
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "[the docs][docs-id]");
  assert.equal(restoreInline(p, tokens), "see [the docs][docs-id] now");
});

test("protectInline replaces autolinks", () => {
  const { protected: p, tokens } = protectInline("ping <https://example.com> please");
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "<https://example.com>");
  assert.equal(restoreInline(p, tokens), "ping <https://example.com> please");
});

test("protectInline handles multiple tokens in one string", () => {
  const input = "use `foo` and [bar](https://x.test) and <https://y.test>";
  const { protected: p, tokens } = protectInline(input);
  assert.equal(tokens.length, 3);
  assert.equal(restoreInline(p, tokens), input);
});

test("protected output contains no spaces from token bodies", () => {
  // This is the load-bearing property: a wrapper joining on whitespace
  // must never see a space that came from inside a token.
  const { protected: p } = protectInline("`a b c` and `d e f`");
  // Whatever the placeholder shape, the protected string should not contain
  // "a b c" or "d e f" verbatim.
  assert.ok(!p.includes("a b c"));
  assert.ok(!p.includes("d e f"));
});

test("restoreInline is a no-op when no tokens", () => {
  assert.equal(restoreInline("plain text", []), "plain text");
});
