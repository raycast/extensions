import assert from "node:assert/strict";
import test from "node:test";

import { createKeepBothPath } from "../src/domain/file-conflicts";

test("keep-both naming preserves file extensions", async () => {
  const existing = new Set(["/tmp/report.pdf", "/tmp/report copy.pdf"]);
  const result = await createKeepBothPath("/tmp/report.pdf", async (path) => existing.has(path));
  assert.equal(result, "/tmp/report copy 2.pdf");
});

test("keep-both naming works for extensionless files and folders", async () => {
  const existing = new Set(["/tmp/Archive"]);
  const result = await createKeepBothPath("/tmp/Archive", async (path) => existing.has(path));
  assert.equal(result, "/tmp/Archive copy");
});
