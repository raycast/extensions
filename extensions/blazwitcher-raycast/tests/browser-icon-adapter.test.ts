import assert from "node:assert/strict";
import test from "node:test";
import { RaycastBrowserIconAdapter } from "../src/browser/browser-icon-adapter";
import type { BrowserExtension } from "@raycast/api";
import type { BrowserEntry } from "../src/types";

const url = "https://example.com/page";
const tab: BrowserEntry = {
  id: "tab:7",
  source: "tab",
  tabId: "7",
  title: "页面",
  url,
};
const bookmark: BrowserEntry = {
  id: "bookmark:1",
  source: "bookmark",
  title: "书签",
  url,
};
function row(
  id = 7,
  favicon = "https://example.com/icon.png",
): BrowserExtension.Tab {
  return { id, url, favicon, active: false };
}

test("标签页按 ID 和 URL 匹配，书签历史按完整 URL 复用图标", async () => {
  const adapter = new RaycastBrowserIconAdapter({
    isAvailable: () => true,
    getTabs: async () => [row()],
  });
  const history = { ...bookmark, id: "history:1", source: "history" as const };
  const other = { ...bookmark, id: "bookmark:2", url: url + "?other=1" };
  const icons = await adapter.getIcons([tab, bookmark, history, other], 1);
  assert.equal(icons.get(tab.id), row().favicon);
  assert.equal(icons.get(bookmark.id), row().favicon);
  assert.equal(icons.get(history.id), row().favicon);
  assert.equal(icons.has(other.id), false);
  assert.equal(
    (await adapter.getIcons([{ ...tab, url: url + "/changed" }], 1)).size,
    0,
  );
});

test("同 URL 的不同图标或重复 ID 不猜测书签归属", async () => {
  for (const rows of [
    [row(), row(8, "https://example.com/other.png"), row(9)],
    [row(), row()],
  ]) {
    const adapter = new RaycastBrowserIconAdapter({
      isAvailable: () => true,
      getTabs: async () => rows,
    });
    assert.equal((await adapter.getIcons([bookmark], 1)).size, 0);
  }
});

test("缺失图标只回退书签历史，SDK 成功图标和无痕均不传入本地读取", async () => {
  let fallbackIds: string[] = [];
  const missing = {
    ...bookmark,
    id: "bookmark:2",
    url: "https://example.com/missing",
  };
  const privateEntry = { ...bookmark, id: "bookmark:3", incognito: true };
  const adapter = new RaycastBrowserIconAdapter(
    { isAvailable: () => true, getTabs: async () => [row()] },
    {
      getIcons: async (entries) => {
        fallbackIds = entries.map((entry) => entry.id);
        return new Map([[missing.id, "/tmp/test-icon.png"]]);
      },
    },
  );
  const icons = await adapter.getIcons(
    [tab, bookmark, missing, privateEntry],
    1,
  );
  assert.deepEqual(fallbackIds, [missing.id]);
  assert.equal(icons.get(missing.id), "/tmp/test-icon.png");
  assert.equal(icons.has(privateEntry.id), false);
});

test("未安装扩展时不请求 SDK，仍可从本地获取图标", async () => {
  let requests = 0;
  const adapter = new RaycastBrowserIconAdapter(
    {
      isAvailable: () => false,
      getTabs: async () => {
        requests++;
        return [];
      },
    },
    {
      getIcons: async () => new Map([[bookmark.id, "/tmp/test-icon.png"]]),
    },
  );
  assert.equal(
    (await adapter.getIcons([bookmark], 1)).get(bookmark.id),
    "/tmp/test-icon.png",
  );
  assert.equal(requests, 0);
});

test("同版本并发请求共享 SDK 快照，数据版本变化后重新读取", async () => {
  let requests = 0;
  const adapter = new RaycastBrowserIconAdapter({
    isAvailable: () => true,
    getTabs: async () => {
      requests++;
      return [row()];
    },
  });
  await Promise.all([
    adapter.getIcons([tab], 1),
    adapter.getIcons([bookmark], 1),
  ]);
  assert.equal(requests, 1);
  await adapter.getIcons([tab], 2);
  assert.equal(requests, 2);
});

test("等待 SDK 时取消，不再调用本地回退", async () => {
  let release!: (value: BrowserExtension.Tab[]) => void;
  let fallbackReads = 0;
  const controller = new AbortController();
  const adapter = new RaycastBrowserIconAdapter(
    {
      isAvailable: () => true,
      getTabs: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    },
    {
      getIcons: async () => {
        fallbackReads++;
        return new Map();
      },
    },
  );
  const pending = adapter.getIcons([bookmark], 1, controller.signal);
  controller.abort();
  release([]);
  await pending;
  assert.equal(fallbackReads, 0);
});

test("SDK 超时和本地读取失败都保留搜索流程", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const adapter = new RaycastBrowserIconAdapter(
    { isAvailable: () => true, getTabs: () => new Promise(() => {}) },
    {
      getIcons: async () => {
        throw new Error("cache unavailable");
      },
    },
  );
  const pending = adapter.getIcons([bookmark], 1);
  t.mock.timers.tick(1500);
  assert.equal((await pending).size, 0);
});
