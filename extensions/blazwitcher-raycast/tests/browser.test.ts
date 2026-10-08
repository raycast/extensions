import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";
import { discoverProfiles } from "../src/browser/profiles";
import { parseBookmarks, readBookmarks } from "../src/browser/bookmarks";
import {
  chromeTimeToUnix,
  parseHistoryLimit,
  readHistory,
} from "../src/browser/history";
import { describeError, openUrlArguments } from "../src/browser/chrome";
import {
  FOCUS_TAB_SCRIPT,
  LIST_TABS_SCRIPT,
} from "../src/browser/chrome-scripts";
import type { Profile } from "../src/types";
import { querySnapshot } from "../src/browser/sqlite";

test("Chrome 独占锁下读取稳定副本，源事务保持不变", () =>
  withProfile(async (profile) => {
    const database = path.join(profile.path, "History");
    const db = new DatabaseSync(database);
    try {
      db.exec(
        "CREATE TABLE urls (id INTEGER, url TEXT, title TEXT, last_visit_time INTEGER); INSERT INTO urls VALUES (1,'https://example.com/','已提交',11644473601000000); BEGIN EXCLUSIVE; UPDATE urls SET title='未提交';",
      );
      const entries = await readHistory(profile, 10);
      assert.equal(entries[0].title, "已提交");
      assert.equal(
        (db.prepare("SELECT title FROM urls").get() as { title: string }).title,
        "未提交",
      );
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  }));

test("快照包含尚未 checkpoint 的 WAL 数据", () =>
  withProfile(async (profile) => {
    const database = path.join(profile.path, "History");
    const db = new DatabaseSync(database);
    try {
      db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('WAL内中文');",
      );
      const result = JSON.parse(
        await querySnapshot(database, "SELECT value FROM sample;"),
      );
      assert.deepEqual(result, [{ value: "WAL内中文" }]);
      assert.equal(
        (db.prepare("SELECT count(*) AS n FROM sample").get() as { n: number })
          .n,
        1,
      );
    } finally {
      db.close();
    }
  }));

async function withProfile(fn: (profile: Profile) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "blazwitcher-test-"));
  try {
    await fn({ id: "Default", name: "测试配置", path: directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const bookmarkFile = (name = "中文书签") => ({
  roots: {
    bookmark_bar: {
      type: "folder",
      name: "收藏栏",
      children: [
        { type: "url", id: "1", name, url: 'https://example.com/?q="x"' },
      ],
    },
  },
});

test("书签双文件合并与错误隔离", () =>
  withProfile(async (profile) => {
    await writeFile(
      path.join(profile.path, "Bookmarks"),
      JSON.stringify(bookmarkFile()),
    );
    await writeFile(
      path.join(profile.path, "AccountBookmarks"),
      JSON.stringify(bookmarkFile()),
    );
    let result = await readBookmarks(profile);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].folder, "收藏栏");
    await writeFile(
      path.join(profile.path, "AccountBookmarks"),
      JSON.stringify(bookmarkFile("另一书签")),
    );
    result = await readBookmarks(profile);
    assert.equal(result.entries.length, 2);
    await writeFile(path.join(profile.path, "AccountBookmarks"), "broken");
    result = await readBookmarks(profile);
    assert.equal(result.entries.length, 1);
    assert.equal(result.warnings.length, 1);
    assert.throws(() => parseBookmarks({}, profile, "Bookmarks"));
  }));

test("配置发现使用 last_used，并拒绝目录穿越", () =>
  withProfile(async (profile) => {
    await mkdir(path.join(profile.path, "Default"));
    await mkdir(path.join(profile.path, "Profile 1"));
    await mkdir(path.join(profile.path, "System Profile"));
    await writeFile(
      path.join(profile.path, "Local State"),
      JSON.stringify({
        profile: {
          last_used: "Profile 1",
          info_cache: {
            "Profile 1": { name: "工作" },
            "../../bad": { name: "不可读取" },
          },
        },
      }),
    );
    const result = await discoverProfiles(profile.path);
    assert.equal(result.defaultId, "Profile 1");
    assert.equal(result.profiles.length, 2);
    assert.equal(result.profiles[0].name, "工作");
  }));

test("真实 SQLite 只读查询、排序、条数及 Chrome 时间转换", () =>
  withProfile(async (profile) => {
    const database = path.join(profile.path, "History");
    execFileSync("/usr/bin/sqlite3", [
      database,
      "CREATE TABLE urls (id INTEGER, url TEXT, title TEXT, last_visit_time INTEGER); INSERT INTO urls VALUES (1,'https://example.com/old','旧记录',11644473601000000),(2,'https://example.com/new','新记录',11644473602000000),(3,'https://example.com/none','未访问',0);",
    ]);
    const entries = await readHistory(profile, 1);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].title, "新记录");
    assert.equal(entries[0].visitedAt, 2000);
    assert.equal(chromeTimeToUnix(11644473600000000), 0);
    assert.equal(parseHistoryLimit("1; DROP TABLE urls"), 20000);
    assert.equal(parseHistoryLimit("10000000"), 100000);
  }));

test("URL 和配置通过独立参数传递，禁止脚本协议及路径穿越", () => {
  const entry = {
    id: "b",
    source: "bookmark" as const,
    title: "测试",
    url: "https://example.com/?q=$(touch%20test)&x='",
    profile: { id: "Profile 1", path: "/tmp", name: "测试" },
  };
  assert.deepEqual(openUrlArguments(entry).slice(-2), [
    "--profile-directory=Profile 1",
    entry.url,
  ]);
  assert.throws(() =>
    openUrlArguments({ ...entry, url: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    openUrlArguments({
      ...entry,
      profile: { ...entry.profile, id: "../Default" },
    }),
  );
});

function mockWindow(id: number, ids: number[]) {
  const tabs = ids.map((value) => ({
    id: () => value,
    title: () => '中文\n"标题"',
    url: () => "https://example.com/",
  }));
  let active = 1;
  return {
    id: () => id,
    tabs: () => tabs,
    mode: () => "normal",
    minimized: true,
    index: 3,
    get activeTabIndex(): () => number {
      return () => active;
    },
    set activeTabIndex(value: number | (() => number)) {
      active = Number(value);
    },
    get activeTab() {
      return tabs[active - 1];
    },
  };
}

test("脚本按实时 ID 定位跨窗口标签，关闭后明确失败", () => {
  const windows = [mockWindow(1, [12, 10]), mockWindow(2, [21, 20])];
  let activated = false;
  const Application = () => ({
    running: () => true,
    windows: () => windows,
    activate: () => {
      activated = true;
    },
  });
  const context = vm.createContext({ Application });
  vm.runInContext(FOCUS_TAB_SCRIPT, context);
  assert.equal(vm.runInContext('run(["20"])', context), "20");
  assert.equal(windows[1].activeTab.id(), 20);
  assert.equal(windows[1].index, 1);
  assert.equal(windows[1].minimized, false);
  assert.equal(activated, true);
  assert.throws(() => vm.runInContext('run(["99"])', context), /TAB_NOT_FOUND/);
  assert.throws(
    () => vm.runInContext('run(["1; bad"])', context),
    /INVALID_TAB_ID/,
  );
});

test("标签脚本使用 JSON 保留特殊标题，无痕默认不读", () => {
  const windows = [
    mockWindow(1, [1]),
    { ...mockWindow(2, [2]), mode: () => "incognito" },
  ];
  const context = vm.createContext({
    Application: () => ({ running: () => true, windows: () => windows }),
  });
  vm.runInContext(LIST_TABS_SCRIPT, context);
  const normal = JSON.parse(vm.runInContext('run(["false"])', context));
  assert.equal(normal.tabs.length, 1);
  assert.equal(normal.tabs[0].title, '中文\n"标题"');
  assert.equal(
    JSON.parse(vm.runInContext('run(["true"])', context)).tabs.length,
    2,
  );
});

test("错误提示不泄漏命令文本或私人 URL", () => {
  assert.ok(
    describeError(new Error("Command failed: private-url -1743")).includes(
      "自动化",
    ),
  );
  assert.ok(
    !describeError(new Error("Command failed: private-url")).includes(
      "private-url",
    ),
  );
});
