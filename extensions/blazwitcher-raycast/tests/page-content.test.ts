import assert from "node:assert/strict";
import test from "node:test";
import {
  readPagePreview,
  type PageContentClient,
} from "../src/browser/page-content";
import {
  compactPreviewMarkdown,
  resultDetailMarkdown,
} from "../src/components/preview-markdown";
import type { BrowserEntry } from "../src/types";

const entry: BrowserEntry = {
  id: "tab:17",
  source: "tab",
  tabId: "17",
  title: "测试页面",
  url: "https://example.com/page",
};
function client(overrides: Partial<PageContentClient> = {}): PageContentClient {
  return {
    isAvailable: () => true,
    getTabs: async () => [{ id: 17, url: entry.url }],
    getContent: async () => "# 正文",
    ...overrides,
  };
}
function preview(value = entry, api = client()) {
  return readPagePreview(value, api, new AbortController().signal);
}

test("预览仅请求选中的普通网页标签，正文去除首尾空白", async () => {
  const calls: unknown[] = [];
  assert.deepEqual(
    await preview(
      entry,
      client({
        getContent: async (options) => {
          calls.push(options);
          return "  # 正文\n  ";
        },
      }),
    ),
    { markdown: "# 正文", truncated: false },
  );
  assert.deepEqual(calls, [{ tabId: 17, format: "markdown" }]);
});

test("书签、历史、无痕和特殊协议预览不访问浏览器扩展", async () => {
  const forbidden = client({
    isAvailable: () => {
      throw new Error("不能读取");
    },
  });
  for (const value of [
    { ...entry, source: "bookmark" as const },
    { ...entry, source: "history" as const },
    { ...entry, incognito: true },
    { ...entry, url: "chrome://settings" },
    { ...entry, tabId: "invalid" },
  ]) {
    assert.ok((await preview(value, forbidden)).message);
  }
});

test("扩展不可用时保留基础信息，不调用读取 API", async () => {
  assert.match(
    (await preview(entry, client({ isAvailable: () => false }))).message!,
    /安装并连接/,
  );
});

test("标签消失、重复 ID 或 URL 不同都拒绝读取正文", async () => {
  for (const tabs of [
    [],
    [{ id: 17, url: "https://example.com/other" }],
    [{ id: 18, url: entry.url }],
    [
      { id: 17, url: entry.url },
      { id: 17, url: entry.url },
    ],
  ]) {
    let reads = 0;
    const result = await preview(
      entry,
      client({
        getTabs: async () => tabs,
        getContent: async () => {
          reads++;
          return "错误正文";
        },
      }),
    );
    assert.match(result.message!, /已关闭或地址发生变化/);
    assert.equal(reads, 0);
  }
});

test("读取过程中导航到其他 URL，不发布旧正文", async () => {
  let reads = 0;
  const result = await preview(
    entry,
    client({
      getTabs: async () => [
        {
          id: 17,
          url: ++reads === 1 ? entry.url : "https://example.com/other",
        },
      ],
    }),
  );
  assert.equal(result.markdown, undefined);
  assert.match(result.message!, /地址发生变化/);
});

test("取消后的正文不发布，也不继续核对浏览器标签", async () => {
  const controller = new AbortController();
  let checks = 0;
  const result = await readPagePreview(
    entry,
    client({
      getTabs: async () => {
        checks++;
        return [{ id: 17, url: entry.url }];
      },
      getContent: async () => {
        controller.abort();
        return "旧正文";
      },
    }),
    controller.signal,
  );
  assert.deepEqual(result, {});
  assert.equal(checks, 1);
});

test("空正文、过长正文和扩展连接错误提供有限输出", async () => {
  assert.match(
    (await preview(entry, client({ getContent: async () => "  " }))).message!,
    /未提取到正文/,
  );
  const long = await preview(
    entry,
    client({ getContent: async () => "文".repeat(8001) }),
  );
  assert.equal(long.markdown?.length, 8000);
  assert.equal(long.truncated, true);
  for (const error of [
    "Access to this page is restricted",
    "Receiving end does not exist",
  ]) {
    const result = await preview(
      entry,
      client({
        getContent: async () => {
          throw new Error(error);
        },
      }),
    );
    assert.match(result.message!, /尚未连接/);
  }
  const failed = await preview(
    entry,
    client({
      getTabs: async () => {
        throw new Error("private-url");
      },
    }),
  );
  assert.match(failed.message!, /读取失败/);
  assert.ok(!failed.message?.includes("private-url"));
});

test("正文超时后不继续发起读取", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let resolveTabs!: (tabs: Array<{ id: number; url: string }>) => void;
  let reads = 0;
  const pending = preview(
    entry,
    client({
      getTabs: () =>
        new Promise((resolve) => {
          resolveTabs = resolve;
        }),
      getContent: async () => {
        reads++;
        return "迟到正文";
      },
    }),
  );
  t.mock.timers.tick(6000);
  assert.match((await pending).message!, /超时/);
  resolveTabs([{ id: 17, url: entry.url }]);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(reads, 0);
});

test("紧凑预览缩小标题并转换图片，保护代码示例", () => {
  const input =
    "# 标题\n![图片](https://example.com/image.png)\n```md\n# 原文\n![原文](image.png)\n```\n`![行内](image.png)`";
  assert.equal(
    compactPreviewMarkdown(input),
    "#### 标题\n[图片](https://example.com/image.png)\n```md\n# 原文\n![原文](image.png)\n```\n`![行内](image.png)`",
  );
});

test("基础信息转义 Markdown，域名链接仍指向完整原始地址", () => {
  const value = {
    ...entry,
    title: "\u200b标题 [链接]",
    url: "https://example.com/path?q=hello world",
  };
  const markdown = resultDetailMarkdown(
    value,
    { message: "正文不可用" },
    false,
  );
  assert.ok(markdown.includes("标题 \\[链接\\]"));
  assert.ok(
    markdown.includes(
      "[example.com](<https://example.com/path?q=hello%20world>)",
    ),
  );
  assert.ok(markdown.includes("正文不可用"));
  assert.equal(value.title, "\u200b标题 [链接]");
});
