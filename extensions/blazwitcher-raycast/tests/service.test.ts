import assert from "node:assert/strict";
import test from "node:test";
import { BrowserService } from "../src/browser/service";
import { defaultBrowserOptions } from "../src/browser/service-types";
import type { BrowserEntry } from "../src/types";
const profile = { id: "Default", name: "默认", path: "/fixture/Default" };
const tab: BrowserEntry = {
  id: "tab:1",
  source: "tab",
  title: "2026 H1 周报",
  url: "https://example.com/weekly",
  tabId: "1",
};
const readers = {
  readTabs: async () => ({ running: true, tabs: [tab] }),
  discoverProfiles: async () => ({ profiles: [profile], defaultId: "Default" }),
  readBookmarks: async () => ({
    entries: [
      { ...tab, id: "bookmark:1", source: "bookmark" as const, profile },
    ],
    warnings: [],
  }),
  readHistory: async () => [
    { ...tab, id: "history:1", source: "history" as const, profile },
  ],
};

test("部分来源失败保留其余结果，权限归属为 Raycast", async () => {
  const service = new BrowserService(() => {}, {
    ...readers,
    readHistory: async () => {
      throw new Error("EACCES private-url");
    },
  });
  await service.configure(defaultBrowserOptions);
  const state = service.snapshot();
  assert.match(state.states.history.warnings[0], /Raycast/);
  assert.doesNotMatch(state.states.history.warnings[0], /private-url/);
  const page = await service.search({
    requestId: 1,
    version: state.version,
    query: "zhoubao",
    scope: "all",
    offset: 0,
  });
  assert.equal(page.total, 1);
  assert.deepEqual(page.results[0].titleRanges, [[8, 9]]);
});

test("多配置书签部分失败时，警告只带一次配置名并保留可用书签", async () => {
  const workProfile = { ...profile, id: "Profile 1", name: "工作" };
  const service = new BrowserService(() => {}, {
    ...readers,
    discoverProfiles: async () => ({
      profiles: [profile, workProfile],
      defaultId: profile.id,
    }),
    readBookmarks: async (selected) => ({
      entries: [
        {
          ...tab,
          id: `bookmark:${selected.id}`,
          source: "bookmark",
          profile: selected,
        },
      ],
      warnings: ["AccountBookmarks 读取失败"],
    }),
  });
  await service.configure(
    { ...defaultBrowserOptions, scope: "bookmark" },
    "all",
  );
  const state = service.snapshot();
  assert.deepEqual(state.states.bookmark.warnings, [
    "默认：AccountBookmarks 读取失败",
    "工作：AccountBookmarks 读取失败",
  ]);
  assert.equal(state.states.bookmark.count, 2);
});

test("新查询、数据刷新和取消之后不能打开旧结果", async () => {
  const service = new BrowserService(() => {}, readers);
  await service.configure(defaultBrowserOptions);
  const request = {
    requestId: 1,
    version: service.snapshot().version,
    query: "zhoubao",
    scope: "all" as const,
    offset: 0,
  };
  await service.search(request);
  const ref = { id: tab.id, version: request.version, requestId: 1 };
  assert.equal(service.entry(ref).url, tab.url);
  service.cancel(2);
  assert.throws(() => service.entry(ref));
  await assert.rejects(service.search(request), /STALE_RESULT/);
  await service.search({ ...request, requestId: 3 });
  await service.refresh();
  assert.throws(() => service.entry({ ...ref, requestId: 3 }));
});

test("50 条分页覆盖尾部结果且不重复，固定来源不可绕过", async () => {
  const tabs = Array.from({ length: 123 }, (_, i) => ({
    ...tab,
    id: `tab:${i}`,
  }));
  const service = new BrowserService(() => {}, {
    ...readers,
    readTabs: async () => ({ running: true, tabs }),
  });
  await service.configure({ ...defaultBrowserOptions, scope: "tab" });
  const request = {
    requestId: 1,
    version: service.snapshot().version,
    query: "",
    scope: "history" as const,
    offset: 0,
  };
  const first = await service.search(request);
  const second = await service.search({ ...request, offset: 50 });
  const third = await service.search({ ...request, offset: 100 });
  assert.equal(first.total, 123);
  assert.equal(
    new Set(
      [...first.results, ...second.results, ...third.results].map(
        (r) => r.entry.id,
      ),
    ).size,
    123,
  );
});

test("切换配置时延迟完成的旧数据不能覆盖新配置", async () => {
  let complete!: (
    value: Awaited<ReturnType<typeof readers.readBookmarks>>,
  ) => void;
  let count = 0;
  const service = new BrowserService(() => {}, {
    ...readers,
    discoverProfiles: async () => ({
      profiles: [profile, { ...profile, id: "Profile 1", name: "工作" }],
      defaultId: "Default",
    }),
    readBookmarks: async (p) => {
      if (++count === 1)
        return new Promise((resolve) => {
          complete = resolve;
        });
      return {
        entries: [{ ...tab, id: p.id, source: "bookmark", profile: p }],
        warnings: [],
      };
    },
  });
  const first = service.configure({
    ...defaultBrowserOptions,
    scope: "bookmark",
  });
  while (!complete) await new Promise((r) => setTimeout(r, 0));
  await service.configure(
    { ...defaultBrowserOptions, scope: "bookmark" },
    "Profile 1",
  );
  complete({
    entries: [{ ...tab, id: "old", source: "bookmark", profile }],
    warnings: [],
  });
  await first;
  const page = await service.search({
    requestId: 1,
    version: service.snapshot().version,
    query: "",
    scope: "all",
    offset: 0,
  });
  assert.deepEqual(
    page.results.map((r) => r.entry.id),
    ["Profile 1"],
  );
});

test("关闭无痕偏好时立刻清除旧索引，离开命令停止接受延迟结果", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof readers.readTabs>>) => void;
  const service = new BrowserService(() => {}, {
    ...readers,
    readTabs: async (include) =>
      include
        ? { running: true, tabs: [{ ...tab, incognito: true }] }
        : new Promise((r) => {
            resolve = r;
          }),
  });
  await service.configure({
    ...defaultBrowserOptions,
    scope: "tab",
    includeIncognito: true,
  });
  const loading = service.configure({ ...defaultBrowserOptions, scope: "tab" });
  const current = await service.search({
    requestId: 1,
    version: service.snapshot().version,
    query: "",
    scope: "all",
    offset: 0,
  });
  assert.equal(current.total, 0);
  service.pause();
  resolve({ running: true, tabs: [tab] });
  await loading;
  assert.equal(service.snapshot().states.tab.count, 0);
});

for (const selectedId of ["Profile 1", "all"])
  test(`切换配置 ${selectedId} 尚未完成时刷新，保留用户的新选择`, async () => {
    const workProfile = { ...profile, id: "Profile 1", name: "工作" };
    let discoveryCount = 0;
    let complete!: (value: {
      profiles: (typeof profile)[];
      defaultId: string;
    }) => void;
    const found = { profiles: [profile, workProfile], defaultId: "Default" };
    const service = new BrowserService(() => {}, {
      ...readers,
      discoverProfiles: async () => {
        if (++discoveryCount === 2)
          return new Promise((resolve) => {
            complete = resolve;
          });
        return found;
      },
      readBookmarks: async (selected) => ({
        entries: [
          { ...tab, id: selected.id, source: "bookmark", profile: selected },
        ],
        warnings: [],
      }),
    });
    const options = { ...defaultBrowserOptions, scope: "bookmark" as const };
    await service.configure(options);
    const switching = service.configure(options, selectedId);
    await service.refresh();
    complete(found);
    await switching;
    assert.equal(service.snapshot().profileId, selectedId);
    const page = await service.search({
      requestId: 1,
      version: service.snapshot().version,
      query: "",
      scope: "all",
      offset: 0,
    });
    assert.deepEqual(
      page.results.map((result) => result.entry.profile?.id),
      selectedId === "all" ? [profile.id, workProfile.id] : [workProfile.id],
    );
  });
