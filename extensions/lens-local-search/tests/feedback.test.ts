import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SearchFeedback } from "../src/feedback.ts";
import type { Hit } from "../src/backend.ts";

test("explicit feedback persists locally, stays query/version scoped, and never adds files outside the filtered results", (t) => {
  const root = mkdtempSync(join(tmpdir(), "lens-feedback-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const feedback = new SearchFeedback(root);
  const a: Hit = { path: "/a.pdf", size: 1, modified: 1, kind: "pdf", segment: "name", segment_id: 1, info: {} };
  const b = { ...a, path: "/b.pdf" };
  const result = { hits: [a, b], strong: 2, meaning: true };
  feedback.rate("blue sweater", a, false);
  assert.deepEqual(new SearchFeedback(root).apply("blue sweater", result).hits, [b, a]);
  assert.deepEqual(feedback.apply("red sweater", result).hits, [a, b]);
  assert.deepEqual(feedback.apply("blue sweater", { ...result, hits: [b], strong: 1 }).hits, [b]);
  assert.deepEqual(feedback.apply("blue sweater", { ...result, hits: [{ ...a, modified: 2 }, b] }).hits.map((h) => h.path), [a.path, b.path]);
  feedback.correct("original", "original\nCorrection: corrected request");
  assert.match(new SearchFeedback(root).resolve("original"), /Correction/);
  feedback.clear(); assert.equal(feedback.resolve("original"), "original");
});
