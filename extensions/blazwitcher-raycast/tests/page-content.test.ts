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
import { SearchIndex } from "../src/search/engine";
import {
  previewImages,
  previewMatches,
  previewText,
} from "./fixtures/preview-images";

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
    /Install and connect/,
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
    assert.match(result.message!, /closed or its URL changed/);
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
  assert.match(result.message!, /URL changed/);
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
    /No page content was extracted/,
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
    assert.match(result.message!, /not connected/);
  }
  const failed = await preview(
    entry,
    client({
      getTabs: async () => {
        throw new Error("private-url");
      },
    }),
  );
  assert.match(failed.message!, /Could not read page content/);
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
  assert.match((await pending).message!, /timed out/);
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

test("基础信息完整显示，URL 链接仍指向原始地址", () => {
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
  const images = previewImages(markdown);
  assert.equal(images.length, 2);
  assert.equal(previewText(images[0]), "标题 [链接]");
  assert.equal(previewText(images[1]), "https://example.com/path");
  assert.ok(markdown.includes("(<https://example.com/path?q=hello%20world>)"));
  assert.ok(markdown.includes("正文不可用"));
  assert.equal(value.title, "\u200b标题 [链接]");
});

test("预览复用拼音和域名命中范围，只高亮选中的原始文字", async () => {
  const value = {
    ...entry,
    title: "2026 H1 周报 - 飞书云文档",
    url: "https://example.com/report?q=zhoubao",
  };
  const [result] = await new SearchIndex([value]).search(
    "zhoubao example",
    "all",
  );
  assert.ok(result);
  const original = structuredClone(result);
  const markdown = resultDetailMarkdown(
    result.entry,
    { markdown: "正文里的周报与 example 保持原样" },
    false,
    result,
  );
  const [title, url] = previewImages(markdown);
  assert.deepEqual(previewMatches(title), ["周报"]);
  assert.deepEqual(previewMatches(url), ["example"]);
  assert.equal(previewText(title), value.title);
  assert.equal(previewText(url), "https://example.com/report");
  assert.ok(markdown.endsWith("正文里的周报与 example 保持原样"));
  assert.deepEqual(result, original);
});

test("预览完整 URL 的路径命中保持可见，链接仍指向原始 URL", async () => {
  const value = {
    ...entry,
    title: "API Docs",
    url: "https://example.com/api/reference?q=hello world#details",
  };
  const [result] = await new SearchIndex([value], "full-url").search(
    "reference",
    "all",
  );
  assert.ok(result);
  const markdown = resultDetailMarkdown(result.entry, {}, false, result);
  const [, url] = previewImages(markdown);
  assert.deepEqual(previewMatches(url), ["reference"]);
  assert.equal(previewText(url), "https://example.com/api/reference");
  assert.ok(
    markdown.includes(
      "(<https://example.com/api/reference?q=hello%20world#details>)",
    ),
  );
});

test("预览清理标题开头不可见字符后，原始命中位置不会偏移", () => {
  const result = {
    entry: { ...entry, title: "\u200b\u200b2026 周报" },
    titleRanges: [[7, 8]] as [number, number][],
    urlRanges: [],
    score: 0,
  };
  const [title] = previewImages(
    resultDetailMarkdown(result.entry, {}, false, result),
  );
  assert.equal(previewText(title), "2026 周报");
  assert.deepEqual(previewMatches(title), ["周报"]);
});

test("分散和相邻命中合并正确，emoji 前后的文字与原始范围保持完整", () => {
  const result = {
    entry: { ...entry, title: "😄周会和日报" },
    titleRanges: [
      [6, 6],
      [2, 2],
      [3, 3],
    ] as [number, number][],
    urlRanges: [],
    score: 0,
  };
  const [title] = previewImages(
    resultDetailMarkdown(result.entry, {}, false, result),
  );
  assert.equal(previewText(title), "😄周会和日报");
  assert.deepEqual(previewMatches(title), ["周会", "报"]);
  assert.deepEqual(result.titleRanges, [
    [6, 6],
    [2, 2],
    [3, 3],
  ]);
});

test("空命中不产生高亮，标题的 Markdown 和公式符号按文字显示", () => {
  const result = {
    entry: { ...entry, title: "[文档] **内容** $price &copy;" },
    titleRanges: [],
    urlRanges: [],
    score: 0,
  };
  const markdown = resultDetailMarkdown(result.entry, {}, true, result);
  const images = previewImages(markdown);
  assert.deepEqual(images.flatMap(previewMatches), []);
  assert.equal(previewText(images[0]), result.entry.title);
  assert.ok(markdown.includes("Loading page content…"));
});

test("命中文字的 HTML 和 Markdown 特殊字符只能作为文字，不能注入预览", () => {
  const title =
    '<img src="https://example.com/leak" onload="alert(1)"> & a_b#c%$`{g}';
  const [svg] = previewImages(
    resultDetailMarkdown({ ...entry, title }, {}, false, {
      titleRanges: [[0, title.length - 1]],
      urlRanges: [],
    }),
  );
  assert.equal(previewText(svg), title);
  assert.equal(previewMatches(svg).join(""), title);
  assert.ok(!svg.includes("<img"));
  assert.ok(!svg.includes("<script"));
});

test("命中包含反引号或首尾空格时仍保持完整的高亮文字", () => {
  for (const title of ["a``b", "`code`", " word "]) {
    const [svg] = previewImages(
      resultDetailMarkdown({ ...entry, title }, {}, false, {
        titleRanges: [[0, title.length - 1]],
        urlRanges: [],
      }),
    );
    assert.equal(previewText(svg), title);
    assert.deepEqual(previewMatches(svg), [title]);
  }
});

test("长标题和长 URL 换行后保留完整文字以及跨行命中", () => {
  const title = "周报与计划".repeat(30) + "👨‍👩‍👧‍👦";
  const url = "https://example.com/" + "long-path/".repeat(30);
  const images = previewImages(
    resultDetailMarkdown({ ...entry, title, url }, {}, false, {
      titleRanges: [[0, title.length - 1]],
      urlRanges: [[0, url.length - 1]],
    }),
  );
  assert.equal(images.length, 2);
  for (const [svg, original] of [
    [images[0], title],
    [images[1], url],
  ]) {
    assert.equal(previewText(svg), original);
    assert.equal(previewMatches(svg).join(""), original);
    assert.ok(previewMatches(svg).length > 1, "跨行背景应分段包裹文字");
    const height = Number(svg.match(/<svg[^>]* height="(\d+)"/)?.[1]);
    assert.ok(height > 44, "多行 SVG 需要增加高度");
    assert.ok(!svg.includes("👨</mark>"), "换行不能拆开组合 emoji");
  }
});

test("SVG 使用宿主动态主文字色与次要灰色，命中背景提供四周留白", () => {
  const [title, url] = previewImages(
    resultDetailMarkdown(entry, {}, false, {
      titleRanges: [[0, 1]],
      urlRanges: [[8, 14]],
    }),
  );
  assert.ok(title.includes("color:raycast-primary-text"));
  assert.ok(url.includes("color:raycast-secondary-text"));
  assert.ok(title.includes("padding:3px 5px"));
  assert.ok(url.includes("padding:3px 5px"));
});

test("三种来源在标题后各显示一个不同颜色的类型标签，不重复占据上下文行", () => {
  const backgrounds: string[] = [];
  for (const [source, label] of [
    ["tab", "Tab"],
    ["history", "History"],
    ["bookmark", "Bookmark"],
  ] as const) {
    const markdown = resultDetailMarkdown(
      {
        ...entry,
        source,
        title: "Report",
        profile: { id: "demo", name: "Demo Profile", path: "/demo" },
      },
      {},
      false,
    );
    const [title] = previewImages(markdown);
    const tags = Array.from(
      title.matchAll(
        /<span class="source-tag" style="([^"]+)">([^<]+)<\/span>/g,
      ),
    );
    assert.equal(tags.length, 1);
    assert.equal(tags[0][2], label);
    const background = tags[0][1].match(/background:([^;]+)/)?.[1];
    assert.ok(background);
    backgrounds.push(background);
    assert.ok(title.indexOf("Report") < title.indexOf('class="source-tag"'));
    assert.equal(markdown.split("\n\n")[1], "Demo Profile");
  }
  assert.equal(new Set(backgrounds).size, 3);
});

test("预览 URL 隐藏 query 与 fragment，只保留原始域名路径，链接与记录仍完整", () => {
  const value = {
    ...entry,
    url: "https://example.com/docs/report?token=secret#section",
  };
  const original = structuredClone(value);
  const markdown = resultDetailMarkdown(value, {}, false, {
    titleRanges: [],
    urlRanges: [
      [8, 14],
      [26, 34],
      [39, 44],
    ],
  });
  const [, url] = previewImages(markdown);
  assert.equal(previewText(url), "https://example.com/docs/report");
  assert.deepEqual(previewMatches(url), ["example", "eport"]);
  assert.ok(
    markdown.includes(
      "(<https://example.com/docs/report?token=secret#section>)",
    ),
  );
  assert.deepEqual(value, original);
});

test("只命中 query 参数时，预览不把高亮错误地移到 path", async () => {
  const value = {
    ...entry,
    title: "API Docs",
    url: "https://example.com/api?token=hiddenmatch",
  };
  const [result] = await new SearchIndex([value], "full-url").search(
    "hiddenmatch",
    "all",
  );
  assert.ok(result);
  const [, url] = previewImages(resultDetailMarkdown(value, {}, false, result));
  assert.equal(previewText(url), "https://example.com/api");
  assert.deepEqual(previewMatches(url), []);
});

test("path 的编码问号与井号不会被当作 query 或 fragment 分隔符", () => {
  const value = { ...entry, url: "https://example.com/a%3Fb%23c?query=value" };
  const [, url] = previewImages(
    resultDetailMarkdown(value, {}, false, {
      titleRanges: [],
      urlRanges: [[21, 27]],
    }),
  );
  assert.equal(previewText(url), "https://example.com/a%3Fb%23c");
  assert.deepEqual(previewMatches(url), ["%3Fb%23"]);
});

test("标题接近行尾时为类型标签增加足够高度，并把标签放在标题末尾", () => {
  const value = { ...entry, source: "history" as const, title: "W".repeat(23) };
  const [svg] = previewImages(resultDetailMarkdown(value, {}, false));
  assert.equal(previewText(svg), value.title);
  assert.ok(Number(svg.match(/<svg[^>]* height="(\d+)"/)?.[1]) > 44);
  assert.match(svg, /W<span class="source-tag"[^>]*>History<\/span><\/div>/);
});

test("常见长度的标题与类型标签保持在同一行", () => {
  const value = { ...entry, title: "2026 H1 周报 — Blazwitcher Preview Demo" };
  const [svg] = previewImages(
    resultDetailMarkdown(value, {}, false, {
      titleRanges: [[8, 9]],
      urlRanges: [],
    }),
  );
  assert.match(svg, /Demo<span class="source-tag"[^>]*>Tab<\/span><\/div>/);
  assert.ok(Number(svg.match(/<svg[^>]* height="(\d+)"/)?.[1]) < 60);
});
