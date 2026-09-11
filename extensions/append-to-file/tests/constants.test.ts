import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_EXTENSIONS } from "../src/lib/constants.ts";

test("default extensions include text files", () => {
  assert.deepEqual(DEFAULT_EXTENSIONS, [".txt", ".text", ".md", ".markdown"]);
});
