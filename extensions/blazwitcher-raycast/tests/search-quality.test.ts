import assert from "node:assert/strict";
import test from "node:test";
import { SearchIndex } from "../src/search/engine";
import type { BrowserEntry } from "../src/types";

const entry: BrowserEntry = {
  id: "tab:1",
  source: "tab",
  title: "中文文档",
  url: "https://example.com/guide",
};

for (const query of ["zw", "zhongwen"])
  test(`网址包含 ${query} 时仍优先使用中文标题的拼音命中`, async () => {
    const results = await new SearchIndex([
      { ...entry, id: "tab:url-hit", url: `https://example.com/${query}` },
      { ...entry, id: "tab:title-hit" },
      {
        ...entry,
        id: "tab:url-only",
        title: "其他页面",
        url: `https://example.com/${query}`,
      },
    ]).search(query, "tab");
    assert.equal(results.length, 3);
    const withUrl = results.find(
      (result) => result.entry.id === "tab:url-hit",
    )!;
    const withoutUrl = results.find(
      (result) => result.entry.id === "tab:title-hit",
    )!;
    assert.deepEqual(withUrl.titleRanges, [[0, 1]]);
    assert.deepEqual(withUrl.urlRanges, []);
    assert.equal(withUrl.score, withoutUrl.score);
    assert.equal(results.at(-1)?.entry.id, "tab:url-only");
  });

test("重叠英文词不会因短词先占用长词而漏掉结果", async () => {
  const index = new SearchIndex([{ ...entry, title: "GitHub / git guide" }]);
  for (const query of ["git github", "github git"]) {
    const [result] = await index.search(query, "all");
    assert.ok(result, query);
    assert.deepEqual(result.titleRanges, [
      [0, 5],
      [9, 11],
    ]);
  }
});

test("重叠拼音词保留各自对应的中文原文位置", async () => {
  const [result] = await new SearchIndex([
    { ...entry, title: "中文 / 中" },
  ]).search("zhong zhongwen", "all");
  assert.ok(result);
  assert.deepEqual(result.titleRanges, [
    [0, 1],
    [5, 5],
  ]);
});

test("重复关键词仍需要多个匹配位置，不复用同一段标题", async () => {
  const results = await new SearchIndex([{ ...entry, title: "GitHub" }]).search(
    "github github",
    "all",
  );
  assert.deepEqual(results, []);
});

test("标题优先保留 Unicode 原文范围，并允许跨标题与网址匹配", async () => {
  const index = new SearchIndex([
    { ...entry, title: "😀İ中文文档", url: "https://example.com/zw" },
  ]);
  const [title] = await index.search("zw", "all");
  assert.deepEqual(title.titleRanges, [[3, 4]]);
  const [combined] = await index.search("zw example", "all");
  assert.ok(combined.titleRanges.length);
  assert.ok(combined.urlRanges.length);
});
