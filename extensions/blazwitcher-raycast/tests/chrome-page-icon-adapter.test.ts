import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ChromePageIconAdapter } from "../src/browser/chrome-page-icon-adapter";
import type { BrowserEntry, Profile } from "../src/types";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9kAAAAASUVORK5CYII=",
  "base64",
);
function entry(
  profile: Profile,
  url = "https://example.com/page",
  id = "bookmark:1",
): BrowserEntry {
  return { id, source: "bookmark", title: "页面", url, profile };
}
async function fixture(
  run: (profiles: Profile[], adapter: ChromePageIconAdapter) => Promise<void>,
) {
  const root = await mkdtemp(path.join(tmpdir(), "blazwitcher-icon-test-"));
  const adapter = new ChromePageIconAdapter();
  try {
    const profiles = await Promise.all(
      ["Default", "Profile 1"].map(async (id) => {
        const directory = path.join(root, id);
        await mkdir(directory);
        return { id, name: id, path: directory };
      }),
    );
    await run(profiles, adapter);
  } finally {
    await adapter.dispose();
    await rm(root, { recursive: true, force: true });
  }
}
function database(profile: Profile) {
  const db = new DatabaseSync(path.join(profile.path, "Favicons"));
  db.exec(
    "CREATE TABLE icon_mapping (page_url TEXT, icon_id INTEGER); CREATE TABLE favicon_bitmaps (id INTEGER PRIMARY KEY, icon_id INTEGER, image_data BLOB, width INTEGER);",
  );
  return db;
}
function add(
  db: DatabaseSync,
  url: string,
  iconId = 1,
  image = png,
  width = 32,
) {
  db.prepare("INSERT INTO icon_mapping VALUES (?, ?)").run(url, iconId);
  db.prepare(
    "INSERT INTO favicon_bitmaps (icon_id, image_data, width) VALUES (?, ?, ?)",
  ).run(iconId, image, width);
}

test("本地只读精确 URL 和所属配置，PNG 路径不包含浏览数据", () =>
  fixture(async ([a, b], adapter) => {
    const url = "https://example.com/page?name='quote'";
    const db = database(a);
    add(db, url);
    db.close();
    const before = await readFile(path.join(a.path, "Favicons"));
    const matching = entry(a, url);
    const otherProfile = entry(b, url, "bookmark:2");
    const otherUrl = entry(a, "https://example.com/other", "bookmark:3");
    const icons = await adapter.getIcons([matching, otherProfile, otherUrl], 1);
    assert.equal(icons.size, 1);
    const filename = icons.get(matching.id)!;
    assert.equal(
      path.basename(filename),
      `${createHash("sha256").update(png).digest("hex")}.png`,
    );
    assert.deepEqual(await readFile(filename), png);
    assert.equal((await stat(filename)).mode & 0o777, 0o600);
    assert.equal((await stat(path.dirname(filename))).mode & 0o777, 0o700);
    assert.deepEqual(await readFile(path.join(a.path, "Favicons")), before);
  }));

test("优先接近 32px 的图标，相同内容复用临时文件", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    const value = entry(profile);
    add(db, value.url, 1, png, 32);
    add(db, value.url, 2, Buffer.concat([png, Buffer.from("large")]), 64);
    add(db, "https://example.com/other", 3, png);
    db.close();
    const icons = await adapter.getIcons(
      [value, entry(profile, "https://example.com/other", "history:2")],
      1,
    );
    assert.deepEqual(await readFile(icons.get(value.id)!), png);
    assert.equal(icons.get(value.id), icons.get("history:2"));
  }));

test("标签、无痕、特殊协议和缺少配置不读取本地图标", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    add(db, "https://example.com/page");
    db.close();
    const value = entry(profile);
    const icons = await adapter.getIcons(
      [
        { ...value, source: "tab", tabId: "1" },
        { ...value, incognito: true },
        { ...value, url: "chrome://settings" },
        { ...value, profile: undefined },
      ],
      1,
    );
    assert.equal(icons.size, 0);
  }));

test("数据库缺失、损坏或非 PNG 时保留来源图标", () =>
  fixture(async ([a, b], adapter) => {
    const db = database(a);
    add(db, "https://example.com/page", 1, Buffer.from("invalid"));
    db.close();
    await writeFile(path.join(b.path, "Favicons"), "broken database");
    const missing = { ...b, path: path.join(b.path, "missing") };
    assert.equal(
      (await adapter.getIcons([entry(a), entry(b), entry(missing)], 1)).size,
      0,
    );
  }));

test("版本内缓存缺失，数据版本变化后重新读取", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    const value = entry(profile);
    assert.equal((await adapter.getIcons([value], 1)).size, 0);
    add(db, value.url);
    db.close();
    assert.equal((await adapter.getIcons([value], 1)).size, 0);
    assert.equal((await adapter.getIcons([value], 2)).size, 1);
  }));

test("取消请求不写负缓存，后续请求可以读取同一版本", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    const value = entry(profile);
    add(db, value.url);
    db.close();
    const controller = new AbortController();
    const pending = adapter.getIcons([value], 1, controller.signal);
    controller.abort();
    assert.equal((await pending).size, 0);
    assert.equal((await adapter.getIcons([value], 1)).size, 1);
  }));

test("退出清理临时 PNG，重新使用可创建新目录", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    const value = entry(profile);
    add(db, value.url);
    db.close();
    const first = (await adapter.getIcons([value], 1)).get(value.id)!;
    await adapter.dispose();
    await assert.rejects(stat(first), { code: "ENOENT" });
    const second = (await adapter.getIcons([value], 1)).get(value.id)!;
    assert.notEqual(path.dirname(second), path.dirname(first));
    assert.deepEqual(await readFile(second), png);
  }));

test("读取与退出清理串行执行，不遗留迟到的临时文件", () =>
  fixture(async ([profile], adapter) => {
    const db = database(profile);
    const value = entry(profile);
    add(db, value.url);
    db.close();
    const pending = adapter.getIcons([value], 1);
    const disposing = adapter.dispose();
    const filename = (await pending).get(value.id)!;
    await disposing;
    await assert.rejects(stat(filename), { code: "ENOENT" });
  }));
