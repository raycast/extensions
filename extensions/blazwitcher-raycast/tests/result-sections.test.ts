import assert from "node:assert/strict";
import test from "node:test";
import { createResultSections } from "../src/search/result-sections";
import type { SearchResult } from "../src/types";

const results: SearchResult[] = Array.from({ length: 6 }, (_, index) => ({
  entry: {
    id: `history:${index}`,
    title: `Blaz result ${index}`,
    url: `https://example.com/${index}`,
    source: "history",
  },
  titleRanges: [],
  urlRanges: [],
  score: 0,
}));

test("自定义最优建议数量从排序结果中移动条目，不增加或丢失历史", () => {
  const sections = createResultSections(results, "Blaz", 4);
  assert.equal(sections[0].key, "suggestions");
  assert.deepEqual(sections[0].results, results.slice(0, 4));
  assert.deepEqual(sections[1].results, results.slice(4));
  assert.deepEqual(
    sections.flatMap((section) => section.results),
    results,
  );
});

test("空查询不显示最优建议，配置数量超过结果时只显示实际条目", () => {
  const empty = createResultSections(results, "  ", 4);
  assert.equal(empty.length, 1);
  assert.equal(empty[0].key, "history");
  assert.deepEqual(empty[0].results, results);
  const short = createResultSections(results.slice(0, 3), "Blaz", 4);
  assert.equal(short.length, 1);
  assert.equal(short[0].key, "suggestions");
  assert.deepEqual(short[0].results, results.slice(0, 3));
});
