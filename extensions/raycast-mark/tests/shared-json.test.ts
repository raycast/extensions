import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fsPromises from "node:fs/promises";
import * as fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { exportJson, previewJsonImport } from "../src/import-export.ts";
import {
  bookmarkMutation,
  DEFAULT_LOCATION,
  deleteBookmark,
  emptyCatalog,
  restoreBookmark,
  TRASH_LOCATION,
} from "../src/model.ts";
import type { Bookmark, LibraryEvent, LibraryState } from "../src/model.ts";
import {
  commit,
  configureDirectory,
  publishEvent,
  readLibrary,
  resolveConflicts,
} from "../src/repository.ts";
import {
  exportSharedJson,
  setSharedJsonStorage,
  withExternalSharedJson,
} from "../src/shared-json-storage.ts";
import {
  authoritativePlan,
  connectSharedJson,
  refreshSharedJson,
} from "../src/shared-json-sync.ts";

const ICON_DATA = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="red"/></svg>',
).toString("base64")}`;
const MORE_LOCATION = { groupId: "g-more", subGroupId: "sg-more" };

function gooseSource() {
  const base = emptyCatalog();
  const live = (id: string): Bookmark => ({
    id,
    title: `书签 ${id}`,
    url: `${id}.example.test/path?q={query}`,
    desc: "合成同步数据",
    tags: ["中文", "synthetic"],
    pinned: true,
    allowUniversal: true,
    locations: [DEFAULT_LOCATION],
    createdAt: 100,
    updatedAt: 200,
    serverUpdatedAt: 210,
    visits: 7,
    lastUsed: 300,
    isDeleted: false,
  });
  const first: Bookmark = {
    ...live("b1"),
    icon: {
      type: "custom",
      data: ICON_DATA,
      bgColor: "#112233",
      fetchedAt: 77,
    },
  };
  const second: Bookmark = {
    ...live("b2"),
    locations: [MORE_LOCATION, DEFAULT_LOCATION],
    icon: {
      type: "remote",
      src: "https://icons.example.test/b2.svg",
      cache: ICON_DATA,
      bgColor: "#445566",
      fetchedAt: 88,
    },
  };
  const deleted: Bookmark = {
    ...live("b3"),
    pinned: false,
    locations: [TRASH_LOCATION],
    prevLocations: [MORE_LOCATION, DEFAULT_LOCATION],
    isDeleted: true,
    visits: 19,
  };
  const groups = [
    {
      id: MORE_LOCATION.groupId,
      name: "工作",
      createdAt: 10,
      updatedAt: 20,
      orderIndex: 3,
      children: [
        {
          id: MORE_LOCATION.subGroupId,
          name: "项目",
          createdAt: 11,
          updatedAt: 21,
          bookmarkIds: ["b2"],
        },
      ],
    },
    ...base.groups.map((group, index) => ({
      ...group,
      orderIndex: index + 7,
      children: group.children.map((sub) => ({
        ...sub,
        bookmarkIds: index ? ["b3"] : ["b1", "b2"],
      })),
    })),
  ];
  return {
    groups,
    bookmarks: [second, deleted, first],
    settings: {
      theme: "dark",
      apiKey: "synthetic-goose-key-never-a-real-secret",
      provider: { name: "synthetic", enabled: false },
    },
  };
}

type GooseSource = ReturnType<typeof gooseSource>;
interface Fixture {
  root: string;
  file: string;
  source: GooseSource;
  raw: string;
  state: LibraryState;
}

async function fixture(
  run: (value: Fixture) => Promise<void>,
  source: GooseSource = gooseSource(),
) {
  const parent = await fs.mkdtemp(
    path.join(os.tmpdir(), "raycast-shared-json-"),
  );
  const items = new Map<string, string>();
  setSharedJsonStorage({
    getItem: async (key: string) => items.get(key),
    setItem: async (key: string, value: string) => {
      items.set(key, value);
    },
  } as unknown as Parameters<typeof setSharedJsonStorage>[0]);
  try {
    const root = await configureDirectory(undefined, parent);
    const file = path.join(parent, "goose-marks.json");
    const raw = JSON.stringify(source, null, 2);
    await fs.writeFile(file, raw);
    const connected = await connectSharedJson(
      root,
      file,
      await readLibrary(root),
    );
    assert.equal(
      "warning" in connected ? connected.warning : undefined,
      undefined,
    );
    assert.equal(connected.state.status, "ready");
    await run({ root, file, source, raw, state: connected.state });
  } finally {
    setSharedJsonStorage();
    await fs.rm(parent, { recursive: true, force: true });
  }
}

function byId(state: LibraryState, id: string) {
  const found = state.bookmarks.find((bookmark) => bookmark.id === id);
  assert.ok(found, `书签 ${id} 应存在`);
  return found;
}

async function editTitle(
  root: string,
  state: LibraryState,
  id: string,
  title: string,
) {
  return commit(root, {
    expectedHeads: state.heads,
    mutations: [
      bookmarkMutation(state, { ...byId(state, id), title, updatedAt: 400 }),
    ],
  });
}

async function readSource(file: string): Promise<GooseSource> {
  return JSON.parse(await fs.readFile(file, "utf8")) as GooseSource;
}

function gooseTrashSource() {
  const source = gooseSource();
  const multi = source.bookmarks.find((bookmark) => bookmark.id === "b2")!;
  multi.locations.push(TRASH_LOCATION);
  const trash = source.bookmarks.find((bookmark) => bookmark.id === "b3")!;
  trash.isDeleted = false;
  source.groups
    .find((group) => group.id === TRASH_LOCATION.groupId)!
    .children[0].bookmarkIds.push("b2");
  return source;
}

test("Goose JSON settings are accepted but excluded from Raycast backups", async () =>
  fixture(async ({ root, source, state }) => {
    const plan = previewJsonImport(JSON.stringify(source), state);
    assert.equal(plan.data.bookmarks.length, source.bookmarks.length);
    const backup = JSON.parse(exportJson(state));
    assert.equal(backup.settings, undefined);
    assert.ok(!JSON.stringify(backup).includes(source.settings.apiKey));
    const portable = JSON.parse(await exportSharedJson(root, state));
    assert.equal(portable.settings, undefined);
  }));

test("shared export preserves Goose URL, icon, envelope, ordering and restore locations", async () =>
  fixture(async ({ root, source, raw, state, file }) => {
    assert.deepEqual(await readSource(file), source);
    assert.deepEqual(
      JSON.parse(await exportSharedJson(root, state, raw)),
      source,
    );
    assert.equal(
      byId(state, "b1").url,
      "https://b1.example.test/path?q={query}",
    );
    assert.deepEqual(
      byId(state, "b3").prevLocations,
      source.bookmarks[1].prevLocations,
    );
  }));

test("local title edits and visits preserve source settings, icons and independent ordering", async () =>
  fixture(async ({ root, file, source, state }) => {
    const edited = await editTitle(root, state, "b1", "Raycast 本地标题");
    assert.equal(edited.warning, undefined);
    const expected = structuredClone(source);
    const expectedBookmark = expected.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    expectedBookmark.title = "Raycast 本地标题";
    expectedBookmark.updatedAt = 400;
    assert.deepEqual(await readSource(file), expected);
    const used = await commit(root, {
      expectedHeads: edited.state.heads,
      mutations: [],
      visits: [{ bookmarkId: "b1", usedAt: 800 }],
    });
    assert.equal(used.warning, undefined);
    expectedBookmark.visits = 8;
    expectedBookmark.lastUsed = 800;
    assert.deepEqual(await readSource(file), expected);
  }));

test("external authoritative usage replaces totals once despite existing local visits", async () =>
  fixture(async ({ root, file, state }) => {
    const local = await commit(root, {
      expectedHeads: state.heads,
      mutations: [],
      visits: [{ bookmarkId: "b1", usedAt: 800 }],
    });
    assert.equal(byId(local.state, "b1").visits, 8);
    const external = await readSource(file);
    const changed = external.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    changed.visits = 42;
    changed.lastUsed = 500;
    await fs.writeFile(file, JSON.stringify(external));
    const planned = authoritativePlan(
      previewJsonImport(JSON.stringify(external), local.state),
      local.state,
    );
    assert.ok(planned.mutations.some((mutation) => mutation.entityId === "b1"));
    const refreshed = await refreshSharedJson(root, local.state);
    assert.equal(refreshed.status, "ready");
    assert.equal(byId(refreshed, "b1").visits, 42);
    assert.equal(byId(refreshed, "b1").lastUsed, 500);
    const repeated = await refreshSharedJson(root, refreshed);
    assert.equal(byId(repeated, "b1").visits, 42);
    assert.equal(byId(repeated, "b1").lastUsed, 500);
    const used = await commit(root, {
      expectedHeads: repeated.heads,
      mutations: [],
      visits: [{ bookmarkId: "b1", usedAt: 900 }],
    });
    assert.equal(used.warning, undefined);
    assert.equal(byId(used.state, "b1").visits, 43);
    const published = (await readSource(file)).bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    assert.equal(published.visits, 43);
    assert.equal(published.lastUsed, 900);
  }));

test("external permanent deletion never reappears during later local writes", async () =>
  fixture(async ({ root, file, source, state }) => {
    const external = structuredClone(source);
    external.bookmarks = external.bookmarks.filter(
      (bookmark) => bookmark.id !== "b2",
    );
    for (const group of external.groups)
      for (const sub of group.children)
        sub.bookmarkIds = sub.bookmarkIds.filter((id) => id !== "b2");
    await fs.writeFile(file, JSON.stringify(external));
    const refreshed = await refreshSharedJson(root, state);
    assert.equal(refreshed.status, "ready");
    assert.equal(
      refreshed.bookmarks.some((bookmark) => bookmark.id === "b2"),
      false,
    );
    const edited = await editTitle(root, refreshed, "b1", "删除后本地修改");
    assert.equal(edited.warning, undefined);
    const published = await readSource(file);
    assert.equal(
      published.bookmarks.some((bookmark) => bookmark.id === "b2"),
      false,
    );
    assert.ok(
      published.groups.every((group) =>
        group.children.every((sub) => !sub.bookmarkIds.includes("b2")),
      ),
    );
    assert.equal(
      (await refreshSharedJson(root, edited.state)).bookmarks.some(
        (bookmark) => bookmark.id === "b2",
      ),
      false,
    );
  }));

test("settings-only external edits remain intact after refresh and a local mutation", async () =>
  fixture(async ({ root, file, source, state }) => {
    const external = structuredClone(source);
    external.settings.theme = "light";
    external.settings.apiKey = "changed-synthetic-key";
    await fs.writeFile(file, JSON.stringify(external));
    const refreshed = await refreshSharedJson(root, state);
    assert.equal(refreshed.status, "ready");
    assert.deepEqual(refreshed.heads, state.heads);
    const edited = await editTitle(
      root,
      refreshed,
      "b1",
      "设置修改后的本地标题",
    );
    assert.equal(edited.warning, undefined);
    const published = await readSource(file);
    assert.deepEqual(published.settings, external.settings);
    assert.equal(
      published.bookmarks.find((bookmark) => bookmark.id === "b1")!.title,
      "设置修改后的本地标题",
    );
  }));

test("consecutive refreshes after a shared write keep a valid baseline", async () =>
  fixture(async ({ root, file, state }) => {
    const edited = await editTitle(root, state, "b1", "稳定基线");
    assert.equal(edited.warning, undefined);
    let current = edited.state;
    for (let index = 0; index < 3; index++) {
      current = await refreshSharedJson(root, current);
      assert.equal(current.status, "ready");
      assert.deepEqual(current.heads, edited.state.heads);
    }
    const next = await editTitle(root, current, "b1", "稳定基线再次写入");
    assert.equal(next.warning, undefined);
    assert.equal(
      (await readSource(file)).bookmarks.find(
        (bookmark) => bookmark.id === "b1",
      )!.title,
      "稳定基线再次写入",
    );
  }));

test("unrefreshed external changes and existing locks block both local and shared writes", async () =>
  fixture(async ({ root, file, source, state }) => {
    const external = structuredClone(source);
    external.bookmarks[0].title = "外部并发修改";
    const raw = JSON.stringify(external);
    await fs.writeFile(file, raw);
    await assert.rejects(editTitle(root, state, "b1", "应被拒绝"));
    assert.equal(await fs.readFile(file, "utf8"), raw);
    assert.deepEqual((await readLibrary(root)).heads, state.heads);
    const refreshed = await refreshSharedJson(root, state);
    await fs.writeFile(`${file}.lock`, "another process owns this lock");
    await assert.rejects(editTitle(root, refreshed, "b1", "仍应被拒绝"));
    assert.equal(
      await fs.readFile(`${file}.lock`, "utf8"),
      "another process owns this lock",
    );
    assert.equal(await fs.readFile(file, "utf8"), raw);
    assert.deepEqual((await readLibrary(root)).heads, refreshed.heads);
  }));

test("Goose trash locations with false sync tombstones and multiple locations round-trip exactly", async () =>
  fixture(async ({ root, file, source, raw, state }) => {
    assert.equal(byId(state, "b2").isDeleted, true);
    assert.equal(byId(state, "b3").isDeleted, true);
    assert.deepEqual(byId(state, "b2").locations, [
      MORE_LOCATION,
      DEFAULT_LOCATION,
      TRASH_LOCATION,
    ]);
    assert.deepEqual(
      JSON.parse(await exportSharedJson(root, state, raw)),
      source,
    );
    const edited = await editTitle(root, state, "b1", "垃圾桶同步后修改");
    assert.equal(edited.warning, undefined);
    const expected = structuredClone(source);
    const expectedBookmark = expected.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    expectedBookmark.title = "垃圾桶同步后修改";
    expectedBookmark.updatedAt = 400;
    assert.deepEqual(await readSource(file), expected);
  }, gooseTrashSource()));

test("local delete and restore use Goose locations while keeping its sync tombstone false", async () =>
  fixture(async ({ root, file, source, state }) => {
    const deleted = await commit(root, {
      expectedHeads: state.heads,
      mutations: [deleteBookmark(state, byId(state, "b1"))],
    });
    assert.equal(deleted.warning, undefined);
    assert.equal(byId(deleted.state, "b1").isDeleted, true);
    const deletedSource = (await readSource(file)).bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    assert.equal(deletedSource.isDeleted, false);
    assert.deepEqual(deletedSource.locations, [TRASH_LOCATION]);
    assert.deepEqual(deletedSource.prevLocations, [DEFAULT_LOCATION]);
    const restored = await commit(root, {
      expectedHeads: deleted.state.heads,
      mutations: [restoreBookmark(deleted.state, byId(deleted.state, "b1"))],
    });
    assert.equal(restored.warning, undefined);
    assert.equal(byId(restored.state, "b1").isDeleted, false);
    const restoredSource = await readSource(file);
    const restoredBookmark = restoredSource.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    assert.equal(restoredBookmark.isDeleted, false);
    assert.deepEqual(restoredBookmark.locations, [DEFAULT_LOCATION]);
    const sourceTrashRestored = await commit(root, {
      expectedHeads: restored.state.heads,
      mutations: [restoreBookmark(restored.state, byId(restored.state, "b3"))],
    });
    assert.equal(sourceTrashRestored.warning, undefined);
    const published = await readSource(file);
    const originallyTrashed = published.bookmarks.find(
      (bookmark) => bookmark.id === "b3",
    )!;
    assert.equal(originallyTrashed.isDeleted, false);
    assert.deepEqual(originallyTrashed.locations, [
      MORE_LOCATION,
      DEFAULT_LOCATION,
    ]);
    assert.deepEqual(published.settings, source.settings);
  }, gooseTrashSource()));

test("unpublished local changes block later shared writes even when the source is unchanged", async () =>
  fixture(async ({ root, file, raw, state }) => {
    const unpublished = await withExternalSharedJson(() =>
      editTitle(root, state, "b1", "未发布的本地修改"),
    );
    assert.notDeepEqual(unpublished.state.heads, state.heads);
    assert.equal(await fs.readFile(file, "utf8"), raw);
    await assert.rejects(
      editTitle(root, unpublished.state, "b1", "不得覆盖共享源"),
    );
    assert.equal(await fs.readFile(file, "utf8"), raw);
    assert.deepEqual((await readLibrary(root)).heads, unpublished.state.heads);
    assert.equal(byId(await readLibrary(root), "b1").title, "未发布的本地修改");
  }));

test("failed source switching blocks publication of imported local state to the old source", async () =>
  fixture(async ({ root, file, raw, state }) => {
    const nextFile = path.join(path.dirname(file), "next-goose-marks.json");
    const incoming = gooseSource();
    const changed = incoming.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    changed.title = "切换源导入标题";
    changed.url = "https://icon-fixture.example.com/page";
    changed.icon = { type: "file", path: "att:synthetic-controlled-icon" };
    const expectedRaw = JSON.stringify(incoming);
    await fs.writeFile(nextFile, expectedRaw);
    const concurrentlyChanged = structuredClone(incoming);
    concurrentlyChanged.settings.theme = "light";
    const concurrentRaw = JSON.stringify(concurrentlyChanged);
    const originalLink = fsPromises.link;
    let publications = 0;
    fsPromises.link = async (from, to) => {
      await originalLink(from, to);
      if (path.dirname(String(to)) === path.join(root, "events")) {
        publications++;
        await fs.writeFile(nextFile, concurrentRaw);
      }
    };
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        connectSharedJson(root, nextFile, state, expectedRaw),
      );
      assert.equal(publications, 1);
      const imported = await readLibrary(root);
      assert.equal(byId(imported, "b1").title, "切换源导入标题");
      await assert.rejects(editTitle(root, imported, "b1", "不得写回旧源"));
      assert.equal(await fs.readFile(file, "utf8"), raw);
      assert.equal(await fs.readFile(nextFile, "utf8"), concurrentRaw);
      assert.deepEqual((await readLibrary(root)).heads, imported.heads);
    } finally {
      fsPromises.link = originalLink;
      syncBuiltinESMExports();
    }
  }));

test("explicit conflict resolution publishes the selected snapshot and its visit coverage", async () =>
  fixture(async ({ root, file, state }) => {
    const used = await commit(root, {
      expectedHeads: state.heads,
      mutations: [],
      visits: [{ bookmarkId: "b1", usedAt: 800 }],
    });
    const external = await readSource(file);
    const externalBookmark = external.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    externalBookmark.visits = 42;
    externalBookmark.lastUsed = 900;
    await fs.writeFile(file, JSON.stringify(external));
    const authoritative = await refreshSharedJson(root, used.state);
    assert.deepEqual(authoritative.coveredVisits?.b1, [used.eventId]);
    const edited = await editTitle(root, authoritative, "b1", "当前分支标题");
    assert.equal(edited.warning, undefined);
    const publishedBeforeConflict = await fs.readFile(file, "utf8");
    const concurrent: LibraryEvent = {
      schemaVersion: 1,
      eventId: randomUUID(),
      occurredAt: Date.now(),
      mutations: [
        {
          entity: "bookmark",
          entityId: "b1",
          baseHeads: authoritative.heads["bookmark:b1"],
          value: {
            ...authoritative.baseBookmarks.b1,
            title: "用户选择的并发标题",
            updatedAt: 500,
          },
          coveredVisits: [...(authoritative.coveredVisits?.b1 ?? [])],
        },
      ],
      visits: [],
    };
    await publishEvent(root, concurrent);
    const conflicted = await readLibrary(root);
    assert.equal(conflicted.status, "conflicted");
    const conflict = conflicted.conflicts.find(
      (entry) => entry.entityKey === "bookmark:b1",
    )!;
    assert.equal(conflict.candidates.length, 2);
    assert.ok(
      conflict.candidates.every((candidate) =>
        candidate.coveredVisits?.includes(used.eventId),
      ),
    );
    await assert.rejects(
      commit(root, {
        expectedHeads: conflicted.heads,
        mutations: [],
        visits: [{ bookmarkId: "b1", usedAt: 1000 }],
      }),
    );
    assert.equal(await fs.readFile(file, "utf8"), publishedBeforeConflict);
    assert.deepEqual((await readLibrary(root)).heads, conflicted.heads);
    const selected = conflict.candidates.find(
      (candidate) => candidate.eventId === concurrent.eventId,
    )!;
    const resolved = await resolveConflicts(
      root,
      [
        {
          entity: "bookmark",
          entityId: "b1",
          baseHeads: conflicted.heads["bookmark:b1"],
          value: selected.value,
          coveredVisits: selected.coveredVisits,
          ...(selected.removed ? { removed: true as const } : {}),
        },
      ],
      conflicted.heads,
    );
    assert.equal(resolved.warning, undefined);
    assert.equal(resolved.state.status, "ready");
    assert.equal(byId(resolved.state, "b1").title, "用户选择的并发标题");
    assert.equal(byId(resolved.state, "b1").visits, 42);
    assert.equal(byId(resolved.state, "b1").lastUsed, 900);
    assert.deepEqual(resolved.state.coveredVisits?.b1, selected.coveredVisits);
    const published = (await readSource(file)).bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    assert.equal(published.title, "用户选择的并发标题");
    assert.equal(published.visits, 42);
    const refreshed = await refreshSharedJson(root, resolved.state);
    assert.equal(refreshed.status, "ready");
    assert.deepEqual(refreshed.heads, resolved.state.heads);
    assert.equal(byId(refreshed, "b1").visits, 42);
  }));

test("invalid source icon encoding rejects refresh before changing local events", async () =>
  fixture(async ({ root, file, source, state }) => {
    const external = structuredClone(source);
    const changed = external.bookmarks.find(
      (bookmark) => bookmark.id === "b1",
    )!;
    changed.title = "非法图标不得先导入此标题";
    changed.icon = { type: "custom", data: "data:image/png;base64,ab==" };
    const invalidRaw = JSON.stringify(external);
    await fs.writeFile(file, invalidRaw);
    await assert.rejects(refreshSharedJson(root, state));
    const unchanged = await readLibrary(root);
    assert.deepEqual(unchanged.heads, state.heads);
    assert.equal(byId(unchanged, "b1").title, byId(state, "b1").title);
    assert.equal(await fs.readFile(file, "utf8"), invalidRaw);
  }));
