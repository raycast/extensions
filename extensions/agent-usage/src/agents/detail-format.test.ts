import assert from "node:assert/strict";
import test from "node:test";

import { formatErrorMarkdown, generateAsciiBar } from "./detail-format.ts";

test("generateAsciiBar reserves room for the percentage label at narrow detail widths", () => {
  assert.equal(generateAsciiBar(50), "▰▰▰▰▰▰▱▱▱▱▱▱");
});

test("formatErrorMarkdown keeps a long error message in a wrappable Markdown paragraph", () => {
  const message = "Cursor is not configured. Sign in to cursor.com or paste the Cookie header in extension settings.";

  assert.equal(formatErrorMarkdown(message), `### Message\n\n${message}`);
});
