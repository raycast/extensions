import assert from "node:assert/strict";
import { SearchIndex } from "../../src/search/engine";
import type { BrowserEntry } from "../../src/types";

async function main() {
  const entries = Array.from({ length: 20000 }, (_, i): BrowserEntry => ({
    id: `history:${i}`,
    source: "history",
    title: `git-flow 备忘清单 中文开发文档 ${i}`,
    url: `https://example.com/${i}/${"reference/".repeat(30)}`,
  }));
  // 连续查询覆盖缓存累积；长 URL 会放大按条数缓存拼音边界的旧问题。
  const index = new SearchIndex(entries);
  for (const query of ["git 备wang", "zw", "zhongwen"]) {
    const results = await index.search(query, "history");
    assert.equal(results.length, 20000);
    assert.ok(results.some((result) => result.entry.id === "history:19999"));
  }
}

void main();
