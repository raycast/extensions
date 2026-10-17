import assert from "node:assert/strict";
import test from "node:test";
import { SearchIndex } from "../src/search/engine";
import type { BrowserEntry } from "../src/types";

test("标题的小写展开不会改变网址中希腊词尾的大小写匹配", async () => {
  const entry: BrowserEntry = {
    id: "tab:case-fold",
    source: "tab",
    title: "İ",
    url: "https://example.com/ΟΣ",
  };
  const results = await new SearchIndex([entry], "full-url").search(
    "ος",
    "tab",
  );
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].titleRanges, []);
  assert.deepEqual(results[0].urlRanges, [[20, 21]]);
  assert.equal(entry.url.slice(20, 22), "ΟΣ");
});

test("完整网址的路径、查询参数和片段都参与搜索", async () => {
  const entry: BrowserEntry = {
    id: "bookmark:full-url",
    source: "bookmark",
    title: "浏览器设置",
    url: "https://example.com/deep/path?q=value#section",
  };
  const [result] = await new SearchIndex([entry], "full-url").search(
    "deep value section",
    "bookmark",
  );
  assert.ok(result);
  assert.deepEqual(result.titleRanges, []);
  assert.deepEqual(result.urlRanges, [
    [20, 23],
    [32, 36],
    [38, 44],
  ]);
  assert.deepEqual(
    result.urlRanges.map(([start, end]) => entry.url.slice(start, end + 1)),
    ["deep", "value", "section"],
  );
});

test("两个字段含小写展开字符时仍返回各自原文范围", async () => {
  const entry: BrowserEntry = {
    id: "tab:unicode-offsets",
    source: "tab",
    title: "😀İ中文文档",
    url: "https://example.com/İ目录/path?q=value#section",
  };
  const [result] = await new SearchIndex([entry], "full-url").search(
    "zw path",
    "all",
  );
  assert.ok(result);
  assert.deepEqual(result.titleRanges, [[3, 4]]);
  assert.deepEqual(result.urlRanges, [[24, 27]]);
  assert.equal(entry.title.slice(3, 5), "中文");
  assert.equal(entry.url.slice(24, 28), "path");
});

test("跨字段查询保留完整 emoji 的两个 UTF-16 单元", async () => {
  const entry: BrowserEntry = {
    id: "tab:emoji",
    source: "tab",
    title: "😀İ中文文档",
    url: "https://example.com",
  };
  const [result] = await new SearchIndex([entry], "full-url").search(
    "😀 example",
    "all",
  );
  assert.ok(result);
  assert.deepEqual(result.titleRanges, [[0, 1]]);
  assert.deepEqual(result.urlRanges, [[8, 14]]);
  assert.equal(entry.title.slice(0, 2), "😀");
});

test("多字段匹配保留标题与网址之间换行的紧凑度评分", async () => {
  const entry: BrowserEntry = {
    id: "tab:field-boundary",
    source: "tab",
    title: "文档a",
    url: "https://example.com",
  };
  const [result] = await new SearchIndex([entry], "full-url").search(
    "ahttps",
    "all",
  );
  assert.ok(result);
  assert.deepEqual(result.titleRanges, [[2, 2]]);
  assert.deepEqual(result.urlRanges, [[0, 4]]);
  // 六个命中字母跨过一个换行，整体跨度为七，保持两段命中的扣分。
  assert.equal(result.score, 100 + (50 * 6) / 7 - 2);
});

test("热查询返回独立范围，修改旧结果不会污染后续查询", async () => {
  const index = new SearchIndex(
    [
      {
        id: "tab:range-copy",
        source: "tab",
        title: "中文文档",
        url: "https://example.com",
      },
    ],
    "full-url",
  );
  const [first] = await index.search("zw example", "all");
  const [second] = await index.search("zw example", "all");
  assert.notEqual(first.titleRanges, second.titleRanges);
  assert.notEqual(first.urlRanges, second.urlRanges);
  first.titleRanges[0][0] = 999;
  first.urlRanges.length = 0;
  const [third] = await index.search("zw example", "all");
  for (const result of [second, third]) {
    assert.deepEqual(result.titleRanges, [[0, 1]]);
    assert.deepEqual(result.urlRanges, [[8, 14]]);
  }
});

test("热查询复用已提取的字段文本，不重新读取原条目", async () => {
  let fieldReads = 0;
  const entry: BrowserEntry = {
    id: "history:field-snapshot",
    source: "history",
    get title() {
      fieldReads++;
      return "中文文档";
    },
    get url() {
      fieldReads++;
      return "https://example.com";
    },
  };
  const index = new SearchIndex([entry], "full-url");
  fieldReads = 0;
  for (const query of ["zw example", "zhongwen", "zw example"]) {
    const [result] = await index.search(query, "history");
    assert.ok(result);
    assert.equal(result.entry, entry);
  }
  assert.equal(fieldReads, 0);
});

test("替换来源后移除旧字段，保留其他来源的热查询结果", async () => {
  const tab: BrowserEntry = {
    id: "tab:replace",
    source: "tab",
    title: "旧标签",
    url: "https://example.com/old-tab",
  };
  const retained: BrowserEntry[] = [
    {
      id: "bookmark:retained",
      source: "bookmark",
      title: "中文书签",
      url: "https://example.com/bookmark",
    },
    {
      id: "history:retained",
      source: "history",
      title: "中文历史",
      url: "https://example.com/history",
      visitedAt: 100,
    },
  ];
  const index = new SearchIndex([tab, ...retained], "full-url");
  const before = await index.search("zw", "all");
  assert.equal((await index.search("old-tab", "tab")).length, 1);
  const updated = {
    ...tab,
    title: "新标签",
    url: "https://example.com/new-tab",
  };
  index.replaceSource("tab", [updated]);
  assert.deepEqual(await index.search("old-tab", "all"), []);
  assert.deepEqual(await index.search("旧标签", "all"), []);
  assert.equal((await index.search("new-tab", "tab"))[0].entry, updated);
  assert.equal((await index.search("新标签", "tab"))[0].entry, updated);
  assert.deepEqual(await index.search("zw", "all"), before);
  assert.deepEqual(
    (await index.search("", "all")).map((result) => result.entry.id),
    ["tab:replace", "bookmark:retained", "history:retained"],
  );
});
