import assert from "node:assert/strict";
import { SearchIndex } from "../../src/search/engine";
import type { BrowserEntry } from "../../src/types";

async function main() {
  const entries = Array.from({ length: 20000 }, (_, i): BrowserEntry => ({
    id: `history:${i}`,
    source: "history",
    title: `entry ${i}`,
    url: `https://example.com/${i}/参考资料/${"reference/".repeat(30)}`,
  }));
  const index = new SearchIndex(entries, "full-url");
  // 英文标题不能满足这些查询，必须展开完整长 URL 中的中文拼音。
  for (const [query, expected] of [
    ["cankao", "参考"],
    ["ziliao", "资料"],
    ["ck zl", "参考资料"],
  ]) {
    const results = await index.search(query, "history");
    assert.equal(results.length, entries.length);
    assert.ok(results.some((result) => result.entry.id === "history:19999"));
    for (const result of results) {
      assert.deepEqual(result.titleRanges, []);
      assert.equal(result.urlRanges.length, 1);
      const [start, end] = result.urlRanges[0];
      assert.equal(result.entry.url.slice(start, end + 1), expected);
    }
  }
}

void main();
