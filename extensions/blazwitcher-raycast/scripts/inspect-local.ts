import { performance } from "node:perf_hooks";
import { discoverProfiles } from "../src/browser/profiles";
import { readBookmarks } from "../src/browser/bookmarks";
import { readHistory } from "../src/browser/history";
import { SearchIndex } from "../src/search/engine";

async function main() {
  const { profiles, defaultId } = await discoverProfiles();
  console.log(JSON.stringify({ profileCount: profiles.length, defaultId }));
  const profile = profiles.find((p) => p.id === defaultId);
  if (!profile) throw new Error("找不到配置");
  const start = performance.now();
  const [bookmarks, history] = await Promise.all([
    readBookmarks(profile),
    readHistory(profile, 20000),
  ]);
  console.log(
    JSON.stringify({
      bookmarks: bookmarks.entries.length,
      history: history.length,
      warnings: bookmarks.warnings.length,
      readMs: Math.round(performance.now() - start),
    }),
  );
  const all = [...bookmarks.entries, ...history];
  for (const size of [100, 1000, all.length]) {
    const start = performance.now();
    const index = new SearchIndex(all.slice(0, size));
    console.log(
      JSON.stringify({
        candidates: Math.min(size, all.length),
        indexMs: Math.round(performance.now() - start),
      }),
    );
    for (const query of ["zhongwen", "zw", "github"]) {
      const start = performance.now();
      const result = await index.search(query, "all");
      console.log(
        JSON.stringify({
          candidates: Math.min(size, all.length),
          query,
          matches: result.length,
          searchMs: Math.round(performance.now() - start),
          heapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        }),
      );
    }
  }
}
main().catch(() => {
  console.error("本地读取验证失败，请在 Raycast 中查看来源错误提示。");
  process.exitCode = 1;
});
