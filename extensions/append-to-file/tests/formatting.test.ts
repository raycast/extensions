import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAppendStyle,
  composeAppendedContent,
  formatTimestamp,
} from "../src/lib/formatting.ts";

test("composeAppendedContent enforces single newline separator when configured", () => {
  const result = composeAppendedContent("alpha\n\n", "beta", {
    separator: "\n",
    ensureTrailingNewline: true,
  });

  assert.equal(result, "alpha\nbeta\n");
});

test("composeAppendedContent honors custom separator", () => {
  const result = composeAppendedContent("alpha\n", "beta", {
    separator: "\n---\n",
    ensureTrailingNewline: false,
  });

  assert.equal(result, "alpha\n---\nbeta");
});

test("composeAppendedContent can insert at beginning", () => {
  const result = composeAppendedContent("\nalpha\n", "beta", {
    separator: "\n",
    ensureTrailingNewline: true,
    insertPosition: "beginning",
  });

  assert.equal(result, "beta\nalpha\n");
});

test("applyAppendStyle bullet indents wrapped lines", () => {
  const result = applyAppendStyle("line one\nline two", {
    style: "bullet",
    timestampFormat: "YYYY-MM-DD",
  });

  assert.equal(result, "- line one\n  line two");
});

test("applyAppendStyle quote prefixes each line", () => {
  const result = applyAppendStyle("a\n\nb", {
    style: "quote",
    timestampFormat: "YYYY-MM-DD",
  });

  assert.equal(result, "> a\n>\n> b");
});

test("timestamp format tokens are replaced", () => {
  const when = new Date(2026, 1, 15, 10, 5, 9);
  const stamp = formatTimestamp(when, "YYYY/MM/DD HH:mm:ss");

  assert.equal(stamp, "2026/02/15 10:05:09");
});
