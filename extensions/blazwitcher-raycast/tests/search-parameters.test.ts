import assert from "node:assert/strict";
import test from "node:test";
import { BrowserService } from "../src/browser/service";
import {
  defaultBrowserOptions,
  normalizeBrowserOptions,
} from "../src/browser/service-types";
import { SearchIndex } from "../src/search/engine";
import type { BrowserEntry, Source } from "../src/types";

const row = (source: Source, index: number): BrowserEntry => ({
  id: `${source}:${index}`,
  source,
  title: `公共记录 ${source} ${index}`,
  url: `https://${source}.example.org/${index}`,
  visitedAt: index,
});
const entries = ["tab", "history", "bookmark"].flatMap((source) =>
  Array.from({ length: source === "tab" ? 4 : 30 }, (_, index) =>
    row(source as Source, index),
  ),
);
const counts = (results: Awaited<ReturnType<SearchIndex["search"]>>) =>
  Object.fromEntries(
    ["tab", "history", "bookmark"].map((source) => [
      source,
      results.filter((result) => result.entry.source === source).length,
    ]),
  );

test("搜索参数缺省值和非法输入遵循 Chrome 数量边界", () => {
  const defaults = normalizeBrowserOptions(defaultBrowserOptions);
  assert.equal(defaults.historyDisplayCount, 10);
  assert.equal(defaults.bookmarkDisplayCount, 10);
  assert.equal(defaults.topSuggestionsCount, 2);
  assert.equal(defaults.enableConsecutiveSearch, false);
  const configured = normalizeBrowserOptions({
    ...defaultBrowserOptions,
    historyDisplayCount: 20,
    bookmarkDisplayCount: 15,
    topSuggestionsCount: 4,
    enableConsecutiveSearch: true,
  });
  assert.equal(configured.historyDisplayCount, 20);
  assert.equal(configured.bookmarkDisplayCount, 15);
  assert.equal(configured.topSuggestionsCount, 4);
  assert.equal(configured.enableConsecutiveSearch, true);
  const invalid = normalizeBrowserOptions({
    ...defaultBrowserOptions,
    historyDisplayCount: 0,
    bookmarkDisplayCount: 1.5,
    topSuggestionsCount: Number.NaN,
  });
  assert.equal(invalid.historyDisplayCount, 10);
  assert.equal(invalid.bookmarkDisplayCount, 10);
  assert.equal(invalid.topSuggestionsCount, 2);
  const overflow = normalizeBrowserOptions({
    ...defaultBrowserOptions,
    historyDisplayCount: 21,
    bookmarkDisplayCount: 100,
    topSuggestionsCount: 11,
  });
  assert.equal(overflow.historyDisplayCount, 20);
  assert.equal(overflow.bookmarkDisplayCount, 20);
  assert.equal(overflow.topSuggestionsCount, 10);
});

for (const strategy of ["chrome", "full-url"] as const) {
  test(`${strategy} 使用用户设置的历史和书签数量，并保留所有标签`, async () => {
    const index = new SearchIndex(entries, strategy, {
      historyDisplayCount: 20,
      bookmarkDisplayCount: 15,
      topSuggestionsCount: 4,
    });
    for (const query of ["", "公共记录"]) {
      assert.deepEqual(counts(await index.search(query, "all")), {
        tab: 4,
        history: 20,
        bookmark: 15,
      });
      assert.equal((await index.search(query, "history")).length, 20);
      assert.equal((await index.search(query, "bookmark")).length, 15);
    }
  });

  test(`${strategy} 严格搜索拒绝英文碎片，仍支持中文拼音首字母`, async () => {
    const records: BrowserEntry[] = [
      {
        ...row("history", 0),
        title: "React",
        url: "https://example.org/",
      },
      {
        ...row("history", 1),
        title: "中文搜索",
        url: "https://example.org/chinese",
      },
    ];
    const fuzzy = new SearchIndex(records, strategy, {
      enableConsecutiveSearch: false,
    });
    const strict = new SearchIndex(records, strategy, {
      enableConsecutiveSearch: true,
    });
    assert.equal((await fuzzy.search("rct", "history")).length, 1);
    assert.equal((await strict.search("rct", "history")).length, 0);
    assert.equal((await strict.search("react", "history")).length, 1);
    assert.equal((await fuzzy.search("zws", "history")).length, 1);
    assert.equal((await strict.search("zws", "history")).length, 1);
  });
}

test("直接调用完整网址旧 API 仍不截断历史和书签", async () => {
  const index = new SearchIndex(entries, "full-url");
  assert.deepEqual(counts(await index.search("", "all")), {
    tab: 4,
    history: 30,
    bookmark: 30,
  });
});

test("来源替换保留搜索参数和严格搜索开关", async () => {
  const index = new SearchIndex([], "chrome", {
    historyDisplayCount: 20,
    enableConsecutiveSearch: true,
  });
  index.replaceSource(
    "history",
    Array.from({ length: 30 }, (_, i) => ({
      ...row("history", i),
      title: `React ${i}`,
    })),
  );
  assert.equal((await index.search("react", "history")).length, 20);
  assert.equal((await index.search("rct", "history")).length, 0);
});

test("同查询修改数量或严格开关后立即生效，旧引用失效且不重新读取历史", async () => {
  let historyReads = 0;
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const service = new BrowserService(() => {}, {
    readTabs: async () => ({ running: true, tabs: [] }),
    discoverProfiles: async () => ({
      profiles: [profile],
      defaultId: profile.id,
    }),
    readBookmarks: async () => ({ entries: [], warnings: [] }),
    readHistory: async () => {
      historyReads++;
      return Array.from({ length: 30 }, (_, i) => ({
        ...row("history", i),
        title: `React ${i}`,
      }));
    },
  });
  await service.configure(defaultBrowserOptions);
  const search = (requestId: number, query: string) =>
    service.search({
      requestId,
      version: service.snapshot().version,
      query,
      scope: "history",
      offset: 0,
    });
  const first = await search(1, "rct");
  assert.equal(first.total, 10);
  const ref = {
    id: first.results[0].entry.id,
    version: first.version,
    requestId: 1,
  };
  await service.configure({
    ...defaultBrowserOptions,
    historyDisplayCount: 20,
  });
  assert.equal((await search(2, "rct")).total, 20);
  assert.throws(() => service.entry(ref), /Results changed/);
  assert.equal(historyReads, 1);
  await service.configure({
    ...defaultBrowserOptions,
    historyDisplayCount: 20,
    enableConsecutiveSearch: true,
  });
  assert.equal((await search(3, "rct")).total, 0);
  assert.equal((await search(4, "react")).total, 20);
  assert.equal(historyReads, 1);
  await service.configure({
    ...defaultBrowserOptions,
    historyDays: 30,
    historyDisplayCount: 20,
    enableConsecutiveSearch: true,
  });
  assert.equal(historyReads, 2);
});

test("初读被 effect cleanup 暂停后，搜索参数更新重新读取未完成来源", async () => {
  let historyReads = 0;
  let release!: (entries: BrowserEntry[]) => void;
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const records = Array.from({ length: 30 }, (_, index) => ({
    ...row("history", index),
    title: `React ${index}`,
  }));
  const service = new BrowserService(() => {}, {
    readTabs: async () => ({ running: true, tabs: [] }),
    discoverProfiles: async () => ({
      profiles: [profile],
      defaultId: profile.id,
    }),
    readBookmarks: async () => ({ entries: [], warnings: [] }),
    readHistory: async () => {
      if (++historyReads === 1)
        return new Promise((resolve) => {
          release = resolve;
        });
      return records;
    },
  });
  const options = { ...defaultBrowserOptions, scope: "history" as const };
  const initialLoad = service.configure(options);
  while (!release) await new Promise<void>((resolve) => setImmediate(resolve));
  service.pause();
  try {
    await service.configure({
      ...options,
      historyDisplayCount: 20,
      enableConsecutiveSearch: true,
    });
    assert.equal(historyReads, 2);
    assert.equal(service.snapshot().states.history.loading, false);
    const search = (query: string, requestId: number) =>
      service.search({
        requestId,
        version: service.snapshot().version,
        query,
        scope: "history",
        offset: 0,
      });
    assert.equal((await search("react", 1)).total, 20);
    assert.equal((await search("rct", 2)).total, 0);
    release([{ ...row("history", 100), title: "迟到旧数据" }]);
    await initialLoad;
    assert.equal((await search("react", 3)).total, 20);
  } finally {
    release([]);
    await initialLoad;
  }
});

const overlappingEntries: BrowserEntry[] = [
  {
    ...row("tab", 1),
    id: "t1",
    url: "https://example.org/shared",
    visitedAt: 0,
  },
  {
    ...row("tab", 2),
    id: "t2",
    url: "https://example.org/shared",
    visitedAt: 0,
  },
  {
    ...row("history", 1),
    id: "h1",
    url: "https://example.org/shared",
    visitedAt: 100,
  },
  {
    ...row("history", 2),
    id: "h2",
    url: "https://example.org/shared",
    visitedAt: 90,
  },
  { ...row("history", 3), id: "h3", visitedAt: 80 },
  { ...row("history", 4), id: "h4", visitedAt: 70 },
];

test("完整网址模式配置上限时先对全部来源去重，再截断历史", async () => {
  const index = new SearchIndex(overlappingEntries, "full-url", {
    historyDisplayCount: 2,
  });
  for (const query of ["", "公共记录"]) {
    assert.deepEqual(
      (await index.search(query, "all")).map((result) => result.entry.id),
      ["t1", "t2", "h3", "h4"],
    );
    // 单来源保留增强模式的原去重语义，仍只应用展示数量。
    assert.deepEqual(
      (await index.search(query, "history")).map((result) => result.entry.id),
      ["h1", "h2"],
    );
  }
  const legacy = new SearchIndex(overlappingEntries, "full-url");
  assert.equal((await legacy.search("", "all")).length, 6);
});

test("完整网址服务的历史上限不被重复标签消耗", async () => {
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const service = new BrowserService(() => {}, {
    readTabs: async () => ({
      running: true,
      tabs: overlappingEntries.filter((entry) => entry.source === "tab"),
    }),
    discoverProfiles: async () => ({
      profiles: [profile],
      defaultId: profile.id,
    }),
    readBookmarks: async () => ({ entries: [], warnings: [] }),
    readHistory: async () =>
      overlappingEntries.filter((entry) => entry.source === "history"),
  });
  await service.configure({
    ...defaultBrowserOptions,
    searchStrategy: "full-url",
    historyDisplayCount: 2,
  });
  const page = await service.search({
    requestId: 1,
    version: service.snapshot().version,
    query: "",
    scope: "all",
    offset: 0,
  });
  assert.deepEqual(
    page.results.map((result) => result.entry.id),
    ["t1", "t2", "h3", "h4"],
  );
});
