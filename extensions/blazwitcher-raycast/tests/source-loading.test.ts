import assert from "node:assert/strict";
import test from "node:test";
import { BrowserService } from "../src/browser/service";
import { defaultBrowserOptions } from "../src/browser/service-types";
import type { BrowserEntry } from "../src/types";

const profile = { id: "Default", name: "默认", path: "/fixture/Default" };
const bookmark: BrowserEntry = {
  id: "bookmark:1",
  source: "bookmark",
  title: "中文文档",
  url: "https://example.com/",
  profile,
};
const history: BrowserEntry = {
  ...bookmark,
  id: "history:1",
  source: "history",
};
const readers = {
  readTabs: async () => ({ running: true, tabs: [] }),
  discoverProfiles: async () => ({
    profiles: [profile],
    defaultId: profile.id,
  }),
  readBookmarks: async () => ({ entries: [bookmark], warnings: [] }),
  readHistory: async () => [history],
};

for (const slowSource of ["bookmark", "history"] as const)
  test(`${slowSource} 未完成时，另一个文件来源已可搜索`, async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = new BrowserService(() => {}, {
      ...readers,
      readBookmarks: async () => {
        if (slowSource === "bookmark") await gate;
        return readers.readBookmarks();
      },
      readHistory: async () => {
        if (slowSource === "history") await gate;
        return readers.readHistory();
      },
    });
    const loading = service.configure(defaultBrowserOptions);
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      const fastSource = slowSource === "bookmark" ? "history" : "bookmark";
      const snapshot = service.snapshot();
      assert.equal(snapshot.states[slowSource].loading, true);
      assert.equal(snapshot.states[fastSource].loading, false);
      const page = await service.search({
        requestId: 1,
        version: snapshot.version,
        query: "zw",
        scope: fastSource,
        offset: 0,
      });
      assert.deepEqual(
        page.results.map((result) => result.entry.source),
        [fastSource],
      );
    } finally {
      release();
      await loading;
    }
  });

test("独立书签入口不会额外启动历史读取", async () => {
  let historyReads = 0;
  const service = new BrowserService(() => {}, {
    ...readers,
    readHistory: async () => {
      historyReads++;
      return [history];
    },
  });
  await service.configure({ ...defaultBrowserOptions, scope: "bookmark" });
  assert.equal(historyReads, 0);
});

test("离开命令后，两条并行加载都不能发布迟到结果", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = new BrowserService(() => {}, {
    ...readers,
    readBookmarks: async () => {
      await gate;
      return readers.readBookmarks();
    },
    readHistory: async () => {
      await gate;
      return readers.readHistory();
    },
  });
  const loading = service.configure(defaultBrowserOptions);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const version = service.snapshot().version;
  service.pause();
  release();
  await loading;
  const snapshot = service.snapshot();
  assert.equal(snapshot.version, version);
  assert.equal(snapshot.states.bookmark.count, 0);
  assert.equal(snapshot.states.history.count, 0);
});

test("书签失败不阻止历史完成，全部配置仍按访问时间应用总上限", async () => {
  const workProfile = { ...profile, id: "Profile 1", name: "工作" };
  const service = new BrowserService(() => {}, {
    ...readers,
    discoverProfiles: async () => ({
      profiles: [profile, workProfile],
      defaultId: profile.id,
    }),
    readBookmarks: async () => {
      throw new Error("EACCES");
    },
    readHistory: async (selected) =>
      [1, 2].map((n) => ({
        ...history,
        id: `history:${selected.id}:${n}`,
        profile: selected,
        visitedAt: selected.id === profile.id ? n : n + 1,
      })),
  });
  await service.configure({ ...defaultBrowserOptions, historyLimit: 2 }, "all");
  const snapshot = service.snapshot();
  assert.equal(snapshot.states.bookmark.loading, false);
  assert.equal(snapshot.states.bookmark.warnings.length, 2);
  assert.equal(snapshot.states.history.loading, false);
  assert.equal(snapshot.states.history.count, 2);
  const page = await service.search({
    requestId: 1,
    version: snapshot.version,
    query: "",
    scope: "history",
    offset: 0,
  });
  assert.deepEqual(
    page.results.map((result) => result.entry.visitedAt),
    [3, 2],
  );
});
