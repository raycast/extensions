import assert from "node:assert/strict";
import test from "node:test";
import { resolveSelectedItemId } from "../src/search/selection";
import type { SearchResult } from "../src/types";

const results: SearchResult[] = [
  {
    entry: {
      id: "tab:1",
      source: "tab",
      title: "周报",
      url: "https://example.com/weekly",
    },
    titleRanges: [],
    urlRanges: [],
    score: 0,
  },
];
const warnings = ["warning:history:读取失败", "warning:bookmark:读取失败"];

test("其他来源有结果时，警告行在结果更新和警告重排后保持选中", () => {
  assert.equal(
    resolveSelectedItemId(results, warnings, warnings[0]),
    warnings[0],
  );
  assert.equal(
    resolveSelectedItemId(
      [{ ...results[0], entry: { ...results[0].entry, id: "tab:2" } }],
      [...warnings].reverse(),
      warnings[0],
    ),
    warnings[0],
  );
});

test("初始或已消失的选择回到可用结果，只有警告时仍可选中", () => {
  assert.equal(resolveSelectedItemId(results, warnings, undefined), "tab:1");
  assert.equal(resolveSelectedItemId(results, warnings, "tab:old"), "tab:1");
  assert.equal(resolveSelectedItemId(results, [], warnings[0]), "tab:1");
  assert.equal(resolveSelectedItemId([], warnings, undefined), warnings[0]);
  assert.equal(resolveSelectedItemId([], [], warnings[0]), undefined);
  assert.equal(resolveSelectedItemId(results, warnings, null), "tab:1");
});
