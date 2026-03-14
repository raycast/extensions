import test from "node:test";
import assert from "node:assert/strict";

import { compatibilityNote } from "./compatibility-note";

test("compatibilityNote calls out unsupported targets clearly", () => {
  assert.equal(
    compatibilityNote.title,
    "Not Supported: ChatGPT Web, Codex Desktop",
  );
  assert.equal(
    compatibilityNote.subtitle,
    "Use Claude or Gemini web, or drag files manually",
  );
});
