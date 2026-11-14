import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const document = readFileSync(resolve("src/api/viewerStats.graphql"), "utf8");
const operations = document.split(/\n(?=query )/);

function getOperation(name: string): string {
  const operation = operations.find((candidate) => candidate.startsWith(`query ${name}`));
  assert.ok(operation, `missing ${name} operation`);
  return operation;
}

test("keeps aggregate counts separate from viewer detail nodes", () => {
  const summary = getOperation("getViewerStats");
  const details = getOperation("getViewerStatsDetails");

  assert.doesNotMatch(summary, /\bnodes\s*{/);
  assert.doesNotMatch(details, /\btotalCount\b/);
});
