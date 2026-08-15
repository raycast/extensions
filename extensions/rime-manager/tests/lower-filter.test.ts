import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("lower filter reorders matching candidates without suppressing learned candidates", async () => {
  const source = await readFile(join(process.cwd(), "assets", "raycast_restore_candidate_order_filter.lua"), "utf8");
  assert.doesNotMatch(source, /is_learned|Skip the learned duplicate/);
  assert.match(source, /table\.insert\(lowered, candidate\)/);
  assert.match(source, /for _, candidate in ipairs\(lowered\) do table\.insert\(ordered, candidate\) end/);
  assert.match(source, /raycast_lowered_index[\s\S]*or 4/);
});
