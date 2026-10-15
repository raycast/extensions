import assert from "node:assert/strict";
import test from "node:test";
import { createSearcher, isStrictnessSatisfied } from "text-search-engine";
import { BrowserService } from "../src/browser/service";
import { defaultBrowserOptions } from "../src/browser/service-types";
import { parseBookmarks } from "../src/browser/bookmarks";
import { StartupPreviewCache } from "../src/browser/preview-cache";
import { SearchIndex } from "../src/search/engine";
import { createResultSections } from "../src/search/result-sections";
import type { BrowserEntry } from "../src/types";

const row = (
  id: string,
  title: string,
  url: string,
  source: BrowserEntry["source"] = "history",
  visitedAt = 100,
): BrowserEntry => ({ id, title, url, source, visitedAt });
const ids = (results: Awaited<ReturnType<SearchIndex["search"]>>) =>
  results.map((result) => result.entry.id);

const domainRows = [
  row("exact-ea", "Electronic Arts Home", "https://ea.com/", "history", 500),
  row(
    "react-github",
    "React",
    "https://github.com/facebook/react",
    "history",
    400,
  ),
  row(
    "futbin",
    "EA FC 26 Database and Ratings | FUTBIN",
    "https://www.futbin.com/",
    "history",
    300,
  ),
  row(
    "finance",
    "Search Console",
    "https://finance.example.com/reports",
    "history",
    200,
  ),
  row("negative", "XYZ", "https://xyz.org/"),
];

test("默认域名查询遵循 Chrome 命中段数，不让标题加分压过 ea.com", async () => {
  const results = await new SearchIndex(domainRows).search("ea.com", "history");
  assert.deepEqual(ids(results), [
    "exact-ea",
    "react-github",
    "futbin",
    "finance",
  ]);
  assert.deepEqual(ids(createResultSections(results, "ea.com")[0].results), [
    "exact-ea",
    "react-github",
  ]);
});

test("默认只搜索标题和域名，完整网址模式显式保留路径和标题评分", async () => {
  const entries = [
    row("path", "浏览器设置", "https://example.com/deep/path?q=value#section"),
  ];
  assert.deepEqual(
    await new SearchIndex(entries).search("deep value section", "history"),
    [],
  );
  assert.equal(
    (
      await new SearchIndex(entries, "full-url").search(
        "deep value section",
        "history",
      )
    )[0].entry.id,
    "path",
  );
  assert.equal(
    (
      await new SearchIndex(domainRows, "full-url").search("ea.com", "history")
    )[0].entry.id,
    "react-github",
  );
});

test("默认严格度剔除过于分散的模糊命中，增强模式仍允许", async () => {
  const entries = [row("sparse", "e---a---.---c---o---m", "https://xyz.org/")];
  assert.deepEqual(
    await new SearchIndex(entries).search("ea.com", "history"),
    [],
  );
  assert.equal(
    (await new SearchIndex(entries, "full-url").search("ea.com", "history"))
      .length,
    1,
  );
});

test("默认严格度使用原查询长度，不因 Unicode 小写展开放宽 Chrome 阈值", async () => {
  const entry = row("unicode-query", "iX\u0307", "https://xyz.org/");
  const query = "İ";
  const chromeHit = createSearcher([entry], {
    getFields: ({ title, url }) => ({
      title: title.trim(),
      host: new URL(url).host,
    }),
  }).search(query)[0];
  assert.deepEqual(chromeHit.hitRanges, [
    [0, 0],
    [2, 2],
  ]);
  assert.equal(isStrictnessSatisfied(0.6, query, chromeHit.hitRanges), false);
  const index = new SearchIndex([entry]);
  assert.deepEqual(await index.search(query, "history"), []);
  assert.deepEqual(await index.search(` ${query} `, "history"), []);
  assert.equal(
    (
      await new SearchIndex([{ ...entry, title: query }]).search(
        query,
        "history",
      )
    ).length,
    1,
  );
});

test("默认标题 trim 与合并空格保留原标题和完整 URL 范围", async () => {
  const entry = row("trim", "  Chrome 应用商店  ", "https://example.com/path");
  const [result] = await new SearchIndex([entry]).search(
    "chrome yingyong",
    "history",
  );
  assert.equal(result.entry, entry);
  assert.deepEqual(result.titleRanges, [[2, 10]]);
  const [host] = await new SearchIndex([entry]).search(
    "example.com",
    "history",
  );
  assert.deepEqual(host.urlRanges, [[8, 18]]);
});

test("默认统一字段匹配不对词序重试，增强模式继续支持长词优先重试", async () => {
  const entries = [row("overlap", "GitHub / git guide", "https://xyz.org/")];
  assert.deepEqual(
    await new SearchIndex(entries).search("git github", "history"),
    [],
  );
  assert.equal(
    (await new SearchIndex(entries, "full-url").search("git github", "history"))
      .length,
    1,
  );
});

test("默认保留所有有效标签；非标签按输入顺序以标题或完整 URL 去重", async () => {
  const entries = [
    row("tab-1", "公共记录", "https://example.com/tab", "tab"),
    row("tab-2", "公共记录", "https://example.com/tab", "tab"),
    row("history-tab-copy", "公共记录", "https://example.com/other"),
    row("history-first", "独立记录", "https://example.com/first"),
    row("history-title-copy", "独立记录", "https://example.com/second"),
    row("bookmark-copy", "其他标题", "https://example.com/first", "bookmark"),
  ];
  assert.deepEqual(ids(await new SearchIndex(entries).search("", "all")), [
    "tab-1",
    "tab-2",
    "history-first",
  ]);
  assert.deepEqual(ids(await new SearchIndex(entries).search("", "history")), [
    "history-tab-copy",
    "history-first",
  ]);
  assert.deepEqual(ids(await new SearchIndex(entries).search("", "bookmark")), [
    "bookmark-copy",
  ]);
});

for (const [label, title] of [
  ["空", ""],
  ["空白", " \t "],
] as const) {
  test(`默认保留不同 URL 的${label}标题历史与书签`, async () => {
    const index = new SearchIndex([
      row("history-old", title, "https://example.com/old", "history", 10),
      row("history-new", title, "https://example.com/new", "history", 20),
      row("bookmark-first", title, "https://example.com/first", "bookmark"),
      row("bookmark-second", title, "https://example.com/second", "bookmark"),
    ]);
    for (const query of ["", "example.com"]) {
      assert.deepEqual(ids(await index.search(query, "all")), [
        "history-new",
        "history-old",
        "bookmark-first",
        "bookmark-second",
      ]);
      assert.deepEqual(ids(await index.search(query, "history")), [
        "history-new",
        "history-old",
      ]);
      assert.deepEqual(ids(await index.search(query, "bookmark")), [
        "bookmark-first",
        "bookmark-second",
      ]);
    }
  });
}

test("空白标题标签不占用标题去重键，完整 URL 仍排除跨来源重复", async () => {
  const entries = [
    row("tab-space", " \t ", "https://example.com/tab", "tab"),
    row("tab-copy", " \t ", "https://example.com/tab", "tab"),
    row("history-tab-url", "其他标题", "https://example.com/tab"),
    row("history-space", " \t ", "https://example.com/space", "history", 20),
    row("history-empty", "", "https://example.com/empty", "history", 10),
    row(
      "bookmark-history-url",
      "重复网址",
      "https://example.com/space",
      "bookmark",
    ),
    row(
      "bookmark-space",
      " \t ",
      "https://example.com/bookmark-space",
      "bookmark",
    ),
    row("bookmark-empty", "", "https://example.com/bookmark-empty", "bookmark"),
  ];
  for (const query of ["", "example.com"]) {
    assert.deepEqual(ids(await new SearchIndex(entries).search(query, "all")), [
      "tab-space",
      "tab-copy",
      "history-space",
      "history-empty",
      "bookmark-space",
      "bookmark-empty",
    ]);
  }
});

test("非空标题继续按原始文本去重，完整 URL 仍跨来源去重", async () => {
  const entries = [
    row("tab-padded", "  公共记录  ", "https://example.com/tab", "tab"),
    row("history-tab-title", "  公共记录  ", "https://example.com/tab-copy"),
    row("history-trimmed", "公共记录", "https://example.com/history"),
    row("history-title-copy", "公共记录", "https://example.com/history-copy"),
    row(
      "bookmark-title-copy",
      "公共记录",
      "https://example.com/bookmark-copy",
      "bookmark",
    ),
    row(
      "bookmark-url-copy",
      "独立标题",
      "https://example.com/history",
      "bookmark",
    ),
    row(
      "bookmark-distinct",
      "公共记录 ",
      "https://example.com/bookmark",
      "bookmark",
    ),
  ];
  for (const query of ["", "example.com"]) {
    assert.deepEqual(ids(await new SearchIndex(entries).search(query, "all")), [
      "tab-padded",
      "history-trimmed",
      "bookmark-distinct",
    ]);
  }
});

test("默认单来源和空查询同样只展示各 10 条历史与书签", async () => {
  const entries = ["history", "bookmark"].flatMap((source) =>
    Array.from({ length: 15 }, (_, i) =>
      row(
        `${source}:${i}`,
        `公共记录 ${source} ${i}`,
        `https://example.com/${source}/${i}`,
        source as BrowserEntry["source"],
        i,
      ),
    ),
  );
  const index = new SearchIndex(entries);
  for (const query of ["", "公共记录"]) {
    assert.equal((await index.search(query, "history")).length, 10);
    assert.equal((await index.search(query, "bookmark")).length, 10);
    assert.equal((await index.search(query, "all")).length, 20);
  }
  assert.equal(
    (await new SearchIndex(entries, "full-url").search("", "history")).length,
    15,
  );
});

test("默认过滤空标题或 chrome:// 标签，不为无标题历史和书签生成 URL 标题", async () => {
  const entries = [
    row("empty-tab", "", "https://ea.com/", "tab"),
    row("internal-tab", "历史", "chrome://history/", "tab"),
    row("empty-url", "标签", "", "tab"),
    row("empty-history", "", "https://ea.com/"),
  ];
  const [result] = await new SearchIndex(entries).search("ea.com", "all");
  assert.deepEqual(ids(await new SearchIndex(entries).search("", "all")), [
    "empty-history",
  ]);
  assert.equal(result.entry.title, "");
  assert.deepEqual(result.titleRanges, []);
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const bookmarks = parseBookmarks(
    {
      roots: {
        bar: {
          type: "folder",
          children: [
            { type: "url", id: "1", name: "", url: "https://ea.com/" },
          ],
        },
      },
    },
    profile,
    "Bookmarks",
  );
  assert.equal(bookmarks[0].title, "");
});

test("默认来源替换保留 Chrome 非标签输入顺序，与完成加载的先后无关", async () => {
  const index = new SearchIndex([]);
  index.replaceSource("bookmark", [
    row("bookmark", "共享标题", "https://example.com/bookmark", "bookmark"),
  ]);
  index.replaceSource("history", [
    row("history", "共享标题", "https://example.com/history"),
  ]);
  index.replaceSource("tab", [
    row("tab", "标签", "https://example.com/tab", "tab"),
  ]);
  assert.deepEqual(ids(await index.search("", "all")), ["tab", "history"]);
});

test("服务默认传递历史时间范围并在模式切换后清空旧索引与结果引用", async () => {
  const calls: Array<number | undefined> = [];
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const service = new BrowserService(() => {}, {
    readTabs: async () => ({ running: true, tabs: [] }),
    discoverProfiles: async () => ({
      profiles: [profile],
      defaultId: profile.id,
    }),
    readBookmarks: async () => ({ entries: [], warnings: [] }),
    readHistory: async (_profile, _limit, days) => {
      calls.push(days);
      return [row("path", "说明", "https://example.com/deep/path")];
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
  assert.deepEqual(calls, [14]);
  assert.equal((await search(1, "deep")).total, 0);
  await service.configure({
    ...defaultBrowserOptions,
    searchStrategy: "full-url",
    historyDays: 0,
  });
  const page = await search(2, "deep");
  assert.equal(page.total, 1);
  const ref = { id: "path", requestId: 2, version: page.version };
  await service.configure(defaultBrowserOptions);
  assert.throws(() => service.entry(ref), /Results changed/);
  assert.equal((await search(3, "deep")).total, 0);
  assert.deepEqual(calls, [14, 0, 14]);
});

test("默认同段数标签用真实 lastAccessed，再优先 active，缺失时间保持输入稳定", async () => {
  const entries: BrowserEntry[] = [
    {
      ...row("old", "公共旧页", "https://old.example.com/", "tab"),
      lastAccessed: 10,
    },
    {
      ...row("new", "公共新页", "https://new.example.com/", "tab"),
      lastAccessed: 30,
    },
    {
      ...row("active", "公共当前页", "https://active.example.com/", "tab"),
      lastAccessed: 20,
      active: true,
    },
  ];
  assert.deepEqual(ids(await new SearchIndex(entries).search("公共", "tab")), [
    "active",
    "new",
    "old",
  ]);
  const missing = entries.map((entry) => ({
    ...entry,
    lastAccessed: undefined,
    active: undefined,
  }));
  assert.deepEqual(ids(await new SearchIndex(missing).search("公共", "tab")), [
    "old",
    "new",
    "active",
  ]);
});

test("默认域名匹配不搜索 URL 用户信息，范围定位到真实 host", async () => {
  const entry = row("credentials", "说明", "https://ea.com@ea.com/path");
  const [result] = await new SearchIndex([entry]).search("ea.com", "history");
  assert.deepEqual(result.urlRanges, [[15, 20]]);
  assert.deepEqual(
    await new SearchIndex([
      row("credentials-only", "说明", "https://ea.com@xyz.org/"),
    ]).search("ea.com", "history"),
    [],
  );
});

test("切回默认 14 天范围时，启动预览不能临时显示更旧的历史", async () => {
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const store = new Map<string, string>();
  const previews = new StartupPreviewCache({
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  previews.write("history", profile, [
    {
      ...row(
        "history:Default:old",
        "旧公共记录",
        "https://example.com/old",
        "history",
        Date.now() - 30 * 86_400_000,
      ),
      profile,
    },
  ]);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = new BrowserService(
    () => {},
    {
      readTabs: async () => ({ running: true, tabs: [] }),
      discoverProfiles: async () => ({
        profiles: [profile],
        defaultId: profile.id,
      }),
      readBookmarks: async () => ({ entries: [], warnings: [] }),
      readHistory: async () => {
        await pending;
        return [];
      },
    },
    previews,
  );
  const loading = service.configure(defaultBrowserOptions);
  try {
    await new Promise<void>((resolve) => setImmediate(resolve));
    const state = service.snapshot();
    assert.equal(state.states.history.loading, true);
    const page = await service.search({
      requestId: 1,
      version: state.version,
      query: "",
      scope: "history",
      offset: 0,
    });
    assert.equal(page.total, 0);
  } finally {
    release();
    await loading;
  }
});

test("升级默认策略时淘汰旧 URL 标题回填预览，新预览仍可复用", () => {
  const profile = { id: "Default", name: "测试", path: "/fixture" };
  const store = new Map<string, string>();
  const previews = new StartupPreviewCache({
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
  const entry = {
    ...row(
      "history:Default:blank",
      "",
      "https://example.com/deep-secret-path",
      "history",
      Date.now(),
    ),
    profile,
  };
  store.set(
    "Default:history",
    JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      entries: [{ ...entry, title: entry.url }],
    }),
  );
  assert.equal(previews.read("history", profile, 100), undefined);
  assert.equal(store.has("Default:history"), false);
  previews.write("history", profile, [entry]);
  assert.deepEqual(previews.read("history", profile, 100), [
    { ...entry, folder: undefined },
  ]);
});

test("反复来源替换不会使 SDK 文本预算变负或突破 5000 UTF-16 单元", async () => {
  const index = new SearchIndex([]);
  const entries = Array.from({ length: 100 }, (_, i) =>
    row(
      `history:${i}`,
      `公共记录 ${i} ${"资料".repeat(50)}`,
      `https://example.com/${i}`,
    ),
  );
  const cache = index as unknown as { cachedTextLength: number };
  for (let round = 0; round < 10; round++) {
    index.replaceSource("history", entries);
    await index.search("公共", "history");
    assert.ok(cache.cachedTextLength > 0 && cache.cachedTextLength <= 5000);
    index.replaceSource("history", []);
    assert.equal(cache.cachedTextLength, 0);
  }
});
