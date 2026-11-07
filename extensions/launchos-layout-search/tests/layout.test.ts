import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  appPathFromUrl,
  parseLayout,
  readLayout,
  verifyAppPath,
} from "../src/layout";

test("layout app locations cannot be remote URLs, commands, or non-app files", () => {
  assert.equal(
    appPathFromUrl("file:///Applications/Example%20App.app/"),
    "/Applications/Example App.app",
  );
  for (const value of [
    "https://evil.example/Example.app",
    "file://server/Example.app",
    "file:///tmp/file.txt",
    "file:///tmp/Example.app?run=1",
    "file:///tmp/Example.app#x",
    "file:///tmp/Example%00.app",
    "not a URL",
    null,
  ])
    assert.equal(appPathFromUrl(value), undefined);
});

test("aliases, folders, hidden entries and duplicate locations preserve layout semantics", () => {
  const rows = [
    {
      id: 1,
      name: "Example",
      alias: "My Alias",
      url: "file:///Applications/Example.app/",
      isFolder: 1,
      groupName: "Work",
      pageNumber: 2,
    },
    {
      id: 2,
      name: "Duplicate",
      url: "file:///Applications/Example.app/",
      isFolder: 0,
      pageNumber: 0,
    },
    {
      id: 3,
      name: "Hidden",
      url: "file:///Applications/Hidden.app/",
      hidden: 1,
      pageNumber: 1,
    },
    { id: 4, name: "Bad", url: "https://example.com" },
  ];
  const result = parseLayout(JSON.stringify(rows));
  assert.equal(result.apps.length, 1);
  assert.equal(result.apps[0].name, "My Alias");
  assert.equal(result.apps[0].originalName, "Example");
  assert.equal(result.apps[0].group, "Work");
  assert.equal(result.skipped, 1);
  assert.equal(parseLayout(JSON.stringify(rows), true).apps[1].group, "Page 2");
});

test("invalid formats fail explicitly and oversized layouts report truncation", () => {
  assert.throws(() => parseLayout('{"unexpected":true}'));
  assert.throws(() => parseLayout("not JSON"));
  assert.equal(
    parseLayout(
      JSON.stringify(
        Array.from({ length: 5001 }, (_, i) => ({
          id: i,
          name: "A",
          url: `file:///Applications/A${i}.app`,
        })),
      ),
    ).truncated,
    true,
  );
});

test("SQLite adapter really reads without modifying layout and catches stale app paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "raycast-launchos-test-"));
  try {
    const database = join(dir, "Layout With Spaces.sqlite");
    const app = join(dir, "Sample App.app");
    await mkdir(app);
    const setup = `CREATE TABLE ZAPPENTITY (Z_PK INTEGER,ZNAME TEXT,ZALIAS TEXT,ZURL TEXT,ZBUNDLEID TEXT,ZHIDDEN INTEGER,ZGROUP INTEGER,ZORDER INTEGER);
      CREATE TABLE ZGROUPENTITY (Z_PK INTEGER,ZNAME TEXT,ZISFOLDER INTEGER,ZPAGE INTEGER,ZORDER INTEGER);
      INSERT INTO ZGROUPENTITY VALUES (1,'Focus',1,0,0);
      INSERT INTO ZAPPENTITY VALUES (1,'Sample','Test Alias','${pathToFileURL(app).href}', 'test.app',0,1,0);`;
    await promisify(execFile)("/usr/bin/sqlite3", [database, setup]);
    const before = await promisify(execFile)("/usr/bin/shasum", [
      "-a",
      "256",
      database,
    ]);
    const layout = await readLayout(database);
    assert.equal(layout.apps[0].name, "Test Alias");
    assert.equal(layout.apps[0].group, "Focus");
    await verifyAppPath(app);
    const after = await promisify(execFile)("/usr/bin/shasum", [
      "-a",
      "256",
      database,
    ]);
    assert.equal(before.stdout, after.stdout);
    await assert.rejects(
      verifyAppPath(join(dir, "Gone.app")),
      /no longer installed/,
    );
    await assert.rejects(readLayout(join(dir, "missing.sqlite")), /not found/);
    const wrong = join(dir, "unsupported.sqlite");
    await writeFile(wrong, "Unsupported database");
    await assert.rejects(readLayout(wrong), /Could not read/);
    await assert.rejects(readLayout("relative.sqlite"), /absolute/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
