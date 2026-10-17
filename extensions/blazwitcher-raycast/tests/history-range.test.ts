import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { parseHistoryLimit, readHistory } from "../src/browser/history";

const execute = promisify(execFile);
const chromeEpoch = 11644473600000;
const day = 86400000;

async function fixture(
  records: { id: number; title: string; ageDays: number; url?: string }[],
  run: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(tmpdir(), "blaz-history-range-"));
  const now = Date.now();
  const values = records
    .map(
      ({ id, title, ageDays, url }) =>
        `(${id}, '${url ?? `https://example.com/history/${id}`}', '${title}', ${(now - ageDays * day + chromeEpoch) * 1000})`,
    )
    .join(",");
  try {
    await execute("/usr/bin/sqlite3", [
      path.join(directory, "History"),
      `CREATE TABLE urls (id INTEGER, url TEXT, title TEXT, last_visit_time INTEGER); INSERT INTO urls VALUES ${values};`,
    ]);
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("默认历史读取与 Chrome 一样只包含最近 14 天", async () => {
  await fixture(
    [
      { id: 1, title: "Old public record", ageDays: 15 },
      { id: 2, title: "Recent public record", ageDays: 7 },
      { id: 3, title: "Newest public record", ageDays: 0 },
    ],
    async (directory) => {
      const rows = await readHistory(
        { id: "Default", name: "Public fixture", path: directory },
        1000,
      );
      assert.deepEqual(
        rows.map((row) => row.title),
        ["Newest public record", "Recent public record"],
      );
    },
  );
});

test("显式历史时间范围与数量上限都参与实际 SQLite 查询", async () => {
  await fixture(
    [
      { id: 1, title: "Old public record", ageDays: 15 },
      { id: 2, title: "Recent public record", ageDays: 7 },
      { id: 3, title: "Newest public record", ageDays: 0 },
    ],
    async (directory) => {
      const profile = {
        id: "Default",
        name: "Public fixture",
        path: directory,
      };
      assert.equal((await readHistory(profile, 1000, 1)).length, 1);
      assert.equal((await readHistory(profile, 1000, 0)).length, 3);
      assert.equal((await readHistory(profile, 1, 0)).length, 1);
      assert.equal((await readHistory(profile, 1000, 30)).length, 3);
    },
  );
});

test("默认 1000 条上限可显式扩展，非法输入恢复默认", async () => {
  assert.equal(parseHistoryLimit(), 1000);
  assert.equal(parseHistoryLimit("invalid"), 1000);
  assert.equal(parseHistoryLimit("20000"), 20000);
  assert.equal(parseHistoryLimit("100001"), 100000);
  const records = Array.from({ length: 1002 }, (_, index) => ({
    id: index + 1,
    title: `Public record ${index + 1}`,
    ageDays: index / 100000,
  }));
  await fixture(records, async (directory) => {
    const profile = { id: "Default", name: "Public fixture", path: directory };
    assert.equal(
      (await readHistory(profile, parseHistoryLimit(), 14)).length,
      1000,
    );
    assert.equal((await readHistory(profile, 20000, 14)).length, 1002);
  });
});

test("历史候选排除未来访问和扩展页，按 Chrome 的截断后过滤顺序处理", async () => {
  await fixture(
    [
      { id: 1, title: "Old public record", ageDays: 7 },
      {
        id: 2,
        title: "Extension public record",
        ageDays: 0.0001,
        url: "chrome-extension://public-fixture/page.html",
      },
      { id: 3, title: "Newest public record", ageDays: 0 },
      { id: 4, title: "Future public record", ageDays: -1 },
    ],
    async (directory) => {
      const profile = {
        id: "Default",
        name: "Public fixture",
        path: directory,
      };
      assert.deepEqual(
        (await readHistory(profile, 2)).map((row) => row.title),
        ["Newest public record"],
      );
      assert.deepEqual(
        (await readHistory(profile, 1000)).map((row) => row.title),
        ["Newest public record", "Old public record"],
      );
    },
  );
});
