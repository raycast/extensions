import assert from "node:assert/strict";
import test from "node:test";
import { SearchIndex, lowerWithOffsets } from "../src/search/engine";
import { normalizeRanges } from "../src/search/highlight";
import { parseQuery } from "../src/search/query";
import type { BrowserEntry } from "../src/types";

const entries: BrowserEntry[] = [
  {
    id: "tab:1",
    source: "tab",
    title: "中文文档",
    url: "https://example.com/guide",
  },
  {
    id: "bookmark:1",
    source: "bookmark",
    title: "前端监控平台",
    url: "https://monitor.example.com",
  },
  {
    id: "history:1",
    source: "history",
    title: "Node.js 中文教程",
    url: "https://nodejs.org/docs",
    visitedAt: 100,
  },
];

test("搜索覆盖初始显示页以外的候选", async () => {
  const items = Array.from({ length: 1001 }, (_, index): BrowserEntry => ({
    id: `history:${index}`,
    source: "history",
    title: index === 1000 ? "最后一条中文目标" : `普通记录 ${index}`,
    url: `https://example.com/${index}`,
  }));
  const results = await new SearchIndex(items).search("zuihou", "history");
  assert.equal(results.length, 1);
  assert.equal(results[0].entry.id, "history:1000");
  assert.deepEqual(results[0].titleRanges, [[0, 1]]);
});

test("计算途中取消旧查询，不返回已经积累的旧结果", async () => {
  const items = Array.from({ length: 600 }, (_, index) => ({
    ...entries[0],
    id: `tab:${index}`,
  }));
  let batches = 0;
  const results = await new SearchIndex(items).search(
    "zw",
    "all",
    () => ++batches > 1,
  );
  assert.equal(batches, 2);
  assert.deepEqual(results, []);
});

test("明确匹配优先于来源，相关度相同时标签优先、历史按时间排序", async () => {
  const items: BrowserEntry[] = [
    {
      id: "history:old",
      source: "history",
      title: "GitHub",
      url: "https://example.com/old",
      visitedAt: 10,
    },
    {
      id: "tab:fuzzy",
      source: "tab",
      title: "GitHub 文档",
      url: "https://example.com/docs",
    },
    {
      id: "history:new",
      source: "history",
      title: "GitHub",
      url: "https://example.com/new",
      visitedAt: 20,
    },
    {
      id: "tab:exact",
      source: "tab",
      title: "GitHub",
      url: "https://example.com/exact",
    },
  ];
  const results = await new SearchIndex(items).search("github", "all");
  assert.deepEqual(
    results.map((result) => result.entry.id),
    ["tab:exact", "history:new", "history:old", "tab:fuzzy"],
  );
});

for (const query of ["中文", "zhongwen", "zw"])
  test(`中文、全拼和首字母：${query}`, async () => {
    const results = await new SearchIndex(entries).search(query, "all");
    const hit = results.find((r) => r.entry.id === "tab:1");
    assert.deepEqual(hit?.titleRanges, [[0, 1]]);
    assert.deepEqual(hit?.urlRanges, []);
  });

test("标题与 URL 跨字段分词，保持字段范围", async () => {
  const [result] = await new SearchIndex(entries).search(
    "jk monitor",
    "bookmark",
  );
  assert.equal(result.entry.id, "bookmark:1");
  assert.deepEqual(result.titleRanges, [[2, 3]]);
  assert.equal(
    result.entry.url.slice(result.urlRanges[0][0], result.urlRanges[0][1] + 1),
    "monitor",
  );
});

test("中英文拼音混合及大小写", async () => {
  const [result] = await new SearchIndex(entries).search("NODEzw", "history");
  assert.deepEqual(result.titleRanges, [
    [0, 3],
    [8, 9],
  ]);
});

test("Unicode 代理对和小写扩展保留原始范围", async () => {
  const index = new SearchIndex([{ ...entries[0], title: "😀İ中文文档" }]);
  const [result] = await index.search("zhongwen", "all");
  assert.deepEqual(result.titleRanges, [[3, 4]]);
  assert.equal(result.entry.title.slice(3, 5), "中文");
  assert.deepEqual(lowerWithOffsets("İ").offsets, [
    [0, 0],
    [0, 0],
  ]);
});

test("不因 URL 相同而丢失其他标签或来源", async () => {
  const result = await new SearchIndex([
    entries[0],
    { ...entries[0], id: "tab:2" },
    { ...entries[0], id: "bookmark:2", source: "bookmark" },
  ]).search("zw", "all");
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((r) => r.entry.id),
    ["tab:1", "tab:2", "bookmark:2"],
  );
});

test("取消旧查询且空查询保留全部候选", async () => {
  const index = new SearchIndex(entries);
  assert.deepEqual(await index.search("zw", "all", () => true), []);
  assert.equal((await index.search("", "all")).length, 3);
  assert.deepEqual(await index.search("不存在的标题abcdef", "all"), []);
});

test("来源前缀优先于下拉框选择", () => {
  assert.deepEqual(parseQuery(" /h zw ", "bookmark"), {
    scope: "history",
    text: "zw",
  });
  assert.deepEqual(parseQuery("/t zw", "all"), {
    scope: "tab",
    text: "zw",
  });
  assert.deepEqual(parseQuery("https://example.com/t", "all"), {
    scope: "all",
    text: "https://example.com/t",
  });
});

test("高亮区间合并及边界裁剪", () => {
  assert.deepEqual(
    normalizeRanges(
      [
        [5, 7],
        [1, 3],
        [2, 4],
      ],
      7,
    ),
    [[1, 6]],
  );
});
