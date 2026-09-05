import assert from "node:assert/strict";
import test from "node:test";
import { parseModelIds } from "../src/model-ids";

test("parses multiple model IDs from lines and commas", () => {
  assert.deepEqual(parseModelIds("glm-5.3\nglm-4.7-flash, qwen-plus"), [
    "glm-5.3",
    "glm-4.7-flash",
    "qwen-plus",
  ]);
});

test("trims and de-duplicates model IDs", () => {
  assert.deepEqual(parseModelIds(" glm-5.3,glm-5.3\n\n"), ["glm-5.3"]);
});
