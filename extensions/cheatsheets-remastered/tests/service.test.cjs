const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const axios = require("axios");
const { createHash } = require("node:crypto");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "cheatsheets-test-"));
const values = new Map();
const toasts = [];
let failKey;
const native = {
  environment: { assetsPath: path.resolve("assets"), supportPath: folder },
  LocalStorage: {
    getItem: async (k) => values.get(k),
    setItem: async (k, v) => {
      if (k === failKey) throw new Error("storage full");
      values.set(k, v);
    },
  },
  showToast: async (options) => {
    toasts.push(options);
    return options;
  },
  Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
};
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  return name === "@raycast/api" ? native : originalLoad.call(this, name, ...args);
};
const Service = require("../.test-dist/service").default;
Module._load = originalLoad;
const { LIBRARY_KEY, BACKUP_KEY } = require("../.test-dist/storage");
const originalGet = axios.get;
after(() => {
  axios.get = originalGet;
  fs.rmSync(folder, { recursive: true, force: true });
});
function seed() {
  values.clear();
  toasts.length = 0;
  failKey = undefined;
  const repo = {
    id: "r1",
    owner: "example",
    name: "notes",
    defaultBranch: "main",
    isPrivate: false,
    addedAt: 1,
    url: "https://github.com/example/notes",
    lastSyncedAt: 10,
  };
  const other = { ...repo, id: "r2", name: "other" };
  const sheet = {
    id: "github:example:notes:main:docs%2Fgit.md",
    repositoryId: repo.id,
    slug: "docs/git",
    filePath: "docs/git.md",
    title: "Git",
    content: "Old",
    syncedAt: 10,
    lastAccessedAt: 9,
  };
  const data = {
    version: 2,
    repositories: [repo, other],
    sheets: [
      sheet,
      { ...sheet, id: "removed", filePath: "removed.md", slug: "removed" },
      { ...sheet, id: "other", repositoryId: other.id },
    ],
    custom: [],
    favorites: [{ id: "f", type: "repository", slug: sheet.id, title: "Git", favoritedAt: 1 }],
    hidden: [],
    views: [],
    unresolvedLegacyKeys: [],
  };
  values.set(LIBRARY_KEY, JSON.stringify(data));
  return { repo, sheet, before: values.get(LIBRARY_KEY) };
}
function mockNetwork(failAt = 0, during = () => {}, files = { "docs/git.md": "# Git updated\r\n", "new.md": "# New" }) {
  let count = 0;
  const blobs = {};
  const tree = Object.entries(files).map(([filePath, text]) => {
    const content = Buffer.from(text);
    const sha = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
    blobs[sha] = { sha, encoding: "base64", content: content.toString("base64"), size: content.length };
    return { path: filePath, type: "blob", mode: "100644", sha, size: content.length };
  });
  axios.get = async (url) => {
    count++;
    await during(count);
    if (count === failAt) throw new Error("synthetic network failure");
    if (url.includes("/commits/")) return { data: { sha: "a".repeat(40), commit: { tree: { sha: "b".repeat(40) } } } };
    if (url.includes("/git/trees/")) return { data: { sha: "b".repeat(40), tree, truncated: false } };
    if (url.includes("/git/blobs/")) return { data: blobs[url.split("/").pop()] };
    throw new Error("Live network forbidden in tests");
  };
  return tree;
}
test("service successful sync commits additions updates removals and timestamp together", async () => {
  const { repo, sheet } = seed();
  mockNetwork();
  assert.deepEqual(await Service.syncRepositoryFiles(repo), { success: 2, failed: 0 });
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  assert.equal(saved.sheets.length, 3);
  assert.equal(saved.sheets.find((s) => s.id === sheet.id).content, "# Git updated\r\n");
  assert.equal(saved.sheets.find((s) => s.id === sheet.id).lastAccessedAt, 9);
  assert.ok(saved.sheets.find((s) => s.filePath === "new.md"));
  assert.ok(!saved.sheets.find((s) => s.id === "removed"));
  assert.equal(saved.favorites[0].slug, sheet.id);
  assert.ok(saved.repositories[0].lastSyncedAt > 10);
  assert.equal(saved.repositories[0].lastSyncedAt, saved.sheets.find((s) => s.id === sheet.id).syncedAt);
  assert.equal(toasts.at(-1).style, "success");
  await Service.syncRepositoryFiles(repo);
  assert.equal(JSON.parse(values.get(LIBRARY_KEY)).favorites[0].slug, sheet.id);
});
for (const mode of [
  "partial-download",
  "truncated",
  "interrupted",
  "backup-write",
  "commit-write",
  "repository-edited",
])
  test(`service preserves last good snapshot: ${mode}`, async () => {
    const { repo, before } = seed();
    const controller = new AbortController();
    const tree = mockNetwork(mode === "partial-download" ? 4 : 0, async (count) => {
      if (count === 3 && mode === "interrupted") controller.abort();
      if (count === 3 && mode === "repository-edited")
        await Service.updateUserRepository(repo.id, { subdirectory: "changed" });
    });
    if (mode === "truncated") {
      const get = axios.get;
      axios.get = async (u, o) => {
        const r = await get(u, o);
        if (u.includes("/trees/")) r.data.truncated = true;
        return r;
      };
    }
    if (mode === "backup-write") failKey = BACKUP_KEY;
    if (mode === "commit-write") failKey = LIBRARY_KEY;
    await assert.rejects(Service.syncRepositoryFiles(repo, undefined, controller.signal));
    const saved = JSON.parse(values.get(LIBRARY_KEY));
    assert.deepEqual(saved.sheets, JSON.parse(before).sheets);
    assert.equal(saved.repositories[0].lastSyncedAt, 10);
    assert.equal(toasts.at(-1).style, "failure");
    assert.equal(tree.length, 2);
  });
test("service successful empty repository clears only its own cached sheets", async () => {
  const { repo } = seed();
  const tree = mockNetwork();
  tree.splice(0);
  await Service.syncRepositoryFiles(repo);
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  assert.equal(saved.sheets.length, 1);
  assert.equal(saved.sheets[0].repositoryId, "r2");
  assert.ok(saved.repositories[0].lastSyncedAt > 10);
});
test("repository views update exactly the sheet, history and count", async () => {
  const { sheet } = seed();
  await Service.recordView("repository", sheet.id, sheet.title);
  await Service.recordView("repository", sheet.id, sheet.title);
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  assert.equal(saved.views[0].count, 2);
  assert.ok(saved.sheets[0].lastAccessedAt > 9);
  assert.equal(saved.sheets.find((s) => s.id === "other").lastAccessedAt, 9);
  assert.equal((await Service.getViewStatsMap())[`repository:${sheet.id}`].count, 2);
});
test("custom content stays byte faithful and concurrent saves retain both sheets", async () => {
  seed();
  const content = "  # 😀\r\n<T>\r\n\n";
  await Promise.all([Service.createCustomCheatsheet("A", content), Service.createCustomCheatsheet("B", content)]);
  const sheets = await Service.getCustomCheatsheets();
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0].content, content);
  await Service.updateCustomCheatsheet(sheets[0].id, "Edited", content);
  assert.equal((await Service.getCustomCheatsheets())[0].content, content);
});
test("custom corruption prevents create edit delete from overwriting saved content", async () => {
  seed();
  values.set(LIBRARY_KEY, "{broken");
  for (const action of [
    () => Service.createCustomCheatsheet("A", "B"),
    () => Service.updateCustomCheatsheet("x", "A", "B"),
    () => Service.deleteCustomCheatsheet("x"),
  ])
    await assert.rejects(action());
  assert.equal(values.get(LIBRARY_KEY), "{broken");
});
test("bundled search and reading require no network or authentication", async () => {
  axios.get = async () => {
    throw new Error("Live network forbidden");
  };
  const files = await Service.listFiles();
  assert.ok(files.length > 100);
  assert.ok((await Service.getSheet("git-log")).length > 100);
  assert.ok((await Service.searchDefaultContent("commit")).includes("git-log"));
});
test("stale custom editor cannot overwrite a more recent edit", async () => {
  seed();
  const sheet = await Service.createCustomCheatsheet("A", "Original");
  await Service.updateCustomCheatsheet(sheet.id, "A", "Recent", [], "", sheet.updatedAt - 1).then(
    () => assert.fail("stale update allowed"),
    () => {},
  );
  assert.equal((await Service.getCustomCheatsheets())[0].content, "Original");
});
test("identical slugs in different repositories keep favourites hidden state and history independent", async () => {
  const { sheet } = seed();
  const other = JSON.parse(values.get(LIBRARY_KEY)).sheets.find((s) => s.repositoryId === "r2");
  await Service.toggleHidden("repository", sheet.id, sheet.title);
  await Service.recordView("repository", sheet.id, sheet.title);
  assert.equal((await Service.getHiddenCheatsheets())[0].slug, sheet.id);
  assert.equal(
    (await Service.getFavorites()).some((f) => f.slug === other.id),
    false,
  );
  assert.equal((await Service.getViewStatsMap())[`repository:${other.id}`], undefined);
});
test("deleting a custom sheet and removing a repository affect only their own content", async () => {
  seed();
  const first = await Service.createCustomCheatsheet("Delete", "Synthetic");
  const second = await Service.createCustomCheatsheet("Keep", "Synthetic");
  assert.equal(await Service.deleteCustomCheatsheet(first.id), true);
  assert.deepEqual(
    (await Service.getCustomCheatsheets()).map((s) => s.id),
    [second.id],
  );
  await Service.removeUserRepository("r1");
  assert.equal((await Service.getRepositoryCheatsheets()).length, 1);
  assert.equal((await Service.getRepositoryCheatsheets())[0].repositoryId, "r2");
  assert.equal((await Service.getFavorites()).length, 1);
});

test("custom deletion removes only its associated state and keeps repository state", async () => {
  seed();
  const first = await Service.createCustomCheatsheet("Delete", "Synthetic");
  const keep = await Service.createCustomCheatsheet("Keep", "Synthetic");
  for (const s of [first, keep]) {
    await Service.addToFavorites("custom", s.id, s.title);
    await Service.toggleHidden("custom", s.id, s.title);
    await Service.recordView("custom", s.id, s.title);
  }
  await Service.deleteCustomCheatsheet(first.id);
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  for (const records of [saved.favorites, saved.hidden, saved.views]) {
    assert.ok(!records.some((r) => r.type === "custom" && r.slug === first.id));
    assert.ok(records.some((r) => r.type === "custom" && r.slug === keep.id));
  }
  assert.ok(saved.favorites.some((r) => r.type === "repository"));
});
test("missing bundled assets report an error instead of a usable empty collection", async () => {
  const original = Service.LOCAL_SHEETS_DIR;
  try {
    Service.LOCAL_SHEETS_DIR = path.join(folder, "missing-bundled-assets");
    await assert.rejects(Service.listFiles(), /Bundled cheatsheets unavailable/);
    await assert.rejects(Service.searchDefaultContent("commit"), /Bundled cheatsheets unavailable/);
  } finally {
    Service.LOCAL_SHEETS_DIR = original;
  }
});
test("a lost storage acknowledgement does not falsely claim the old snapshot is current", async () => {
  const { repo, before } = seed();
  mockNetwork();
  const originalSet = native.LocalStorage.setItem;
  native.LocalStorage.setItem = async (key, value) => {
    await originalSet(key, value);
    if (key === LIBRARY_KEY) throw new Error("Synthetic acknowledgement lost after write");
  };
  try {
    await assert.rejects(Service.syncRepositoryFiles(repo), (error) => !error.message.includes("has been retained"));
    assert.notEqual(values.get(LIBRARY_KEY), before);
    assert.equal(values.get(BACKUP_KEY), before);
    assert.ok(!toasts.at(-1).message.includes("Previous snapshot retained"));
    assert.match(toasts.at(-1).message, /Check saved content/);
  } finally {
    native.LocalStorage.setItem = originalSet;
  }
});
test("stale repository editor cannot overwrite newer settings while access timestamps may change", async () => {
  const { repo } = seed();
  await Service.recordRepositoryAccess(repo.id);
  await Service.updateUserRepository(repo.id, { description: "Newer description" }, repo);
  await assert.rejects(
    Service.updateUserRepository(repo.id, { description: "Stale description", subdirectory: "old-selection" }, repo),
    /changed in another command/,
  );
  assert.equal((await Service.getUserRepository(repo.id)).description, "Newer description");
  assert.equal((await Service.getUserRepository(repo.id)).subdirectory, "");
});

test("restored bundled editions browse and search without excluded or missing files", async () => {
  const files = await Service.listFiles();
  for (const file of ["basic.md", "keywords_test.md", "packs.md", "polyfill.io.md"])
    assert.ok(!files.some((entry) => entry.path === file));
  for (const [slug, query] of [
    ["bash", "Bash conditional construct"],
    ["jsdoc", "@typedef"],
    ["markdown", "**bold**"],
    ["python", 'with open("hello.txt"'],
    ["tar", "Appending does not work"],
    ["vim-digraphs", ":digraphs"],
  ]) {
    assert.ok(
      files.some((entry) => entry.path === slug + ".md"),
      slug,
    );
    assert.ok((await Service.getSheet(slug)).length > 100, slug);
    assert.ok((await Service.searchDefaultContent(query)).includes(slug), slug);
  }
});

test("repository reads project metadata without rewriting snapshots, personal data or state", async () => {
  const { sheet } = seed();
  const data = JSON.parse(values.get(LIBRARY_KEY));
  const content =
    '\uFEFF---\r\ntitle: "Frontmatter title"\r\ndescription: >-\r\n  Folded reference\r\n  description\r\ntags: [language, templates]\r\n---\r\n# Git\r\nOriginal 😀\r\n';
  data.sheets[0].content = content;
  data.custom.push({ id: "personal", title: "Personal title", content, createdAt: 1, updatedAt: 2, tags: ["mine"] });
  values.set(LIBRARY_KEY, JSON.stringify(data));
  values.set(BACKUP_KEY, "existing backup");
  const before = [...values];
  const sheets = await Service.getRepositoryCheatsheets("r1");
  assert.equal(sheets[0].title, "Frontmatter title");
  assert.equal(sheets[0].description, "Folded reference description");
  assert.deepEqual(sheets[0].tags, ["language", "templates"]);
  assert.equal(sheets[0].content, content);
  assert.equal(sheets[0].id, sheet.id);
  assert.equal(sheets[0].lastAccessedAt, 9);
  assert.equal((await Service.getCustomCheatsheets())[0].title, "Personal title");
  assert.deepEqual([...values], before);
  await Service.recordView("repository", sheet.id, sheets[0].title);
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  assert.deepEqual(saved.sheets[0], { ...data.sheets[0], lastAccessedAt: saved.sheets[0].lastAccessedAt });
  assert.deepEqual(saved.custom, data.custom);
  assert.deepEqual(saved.favorites, data.favorites);
  assert.equal(saved.views[0].count, 1);
  assert.equal(saved.views[0].title, "Frontmatter title");
});

test("new and cached repository sheets keep H1 or filename fallbacks for unusable metadata", async () => {
  const { repo } = seed();
  mockNetwork();
  await Service.syncRepositoryFiles(repo);
  assert.equal((await Service.getRepositoryCheatsheets("r1"))[0].title, "Git updated");
  const data = JSON.parse(values.get(LIBRARY_KEY));
  data.sheets.find((s) => s.repositoryId === "r1" && s.filePath === "docs/git.md").content =
    "---\ntitle: [bad\n---\n# Git updated\n";
  const noHeading = data.sheets.find((s) => s.repositoryId === "r1" && s.filePath === "new.md");
  noHeading.title = "new";
  noHeading.content = "No heading";
  values.set(LIBRARY_KEY, JSON.stringify(data));
  const before = [...values];
  const sheets = await Service.getRepositoryCheatsheets("r1");
  assert.equal(sheets[0].title, "Git updated");
  assert.equal(sheets[1].title, "new");
  assert.equal(sheets[0].tags, undefined);
  assert.equal(sheets[0].description, undefined);
  assert.deepEqual([...values], before);
});

test("successful sync keeps raw metadata source and derives titles only when read", async () => {
  const { repo, sheet } = seed();
  const source = "---\ntitle: Metadata title\ndescription: Cached description\ntags: [topic]\n---\n# H1 fallback\n";
  mockNetwork(0, () => {}, { "docs/git.md": source, "filename.md": "No heading" });
  await Service.syncRepositoryFiles(repo);
  const saved = JSON.parse(values.get(LIBRARY_KEY));
  const raw = saved.sheets.find((s) => s.id === sheet.id);
  assert.equal(raw.content, source);
  assert.equal(raw.title, "H1 fallback");
  assert.equal(raw.tags, undefined);
  assert.equal(raw.description, undefined);
  const beforeRead = [...values];
  const projected = await Service.getRepositoryCheatsheets(repo.id);
  assert.equal(projected[0].title, "Metadata title");
  assert.equal(projected[0].description, "Cached description");
  assert.deepEqual(projected[0].tags, ["topic"]);
  assert.equal(projected[1].title, "filename");
  assert.deepEqual([...values], beforeRead);
});

test("concurrent local imports create one exact copy and preserve unrelated data and drafts", async () => {
  seed();
  const before = JSON.parse(values.get(LIBRARY_KEY));
  values.set("create-custom-sheet-title", "Unfinished manual draft");
  const input = {
    title: "Imported 日本語",
    content: "\uFEFF# Notes\r\nKeep trailing spaces  \r\n",
    tags: ["CLI"],
    description: "Personal",
  };
  const results = await Promise.all(Array.from({ length: 8 }, () => Service.importCustomCheatsheet(input)));
  assert.equal(results.filter((r) => r.status === "created").length, 1);
  assert.equal(results.filter((r) => r.status === "duplicate").length, 7);
  const after = JSON.parse(values.get(LIBRARY_KEY));
  assert.equal(after.custom.length, 1);
  assert.deepEqual(after.custom[0], {
    ...input,
    id: results[0].sheet.id,
    createdAt: results[0].sheet.createdAt,
    updatedAt: results[0].sheet.updatedAt,
  });
  assert.match(after.custom[0].id, /^custom-/);
  assert.deepEqual({ ...after, custom: [] }, before);
  assert.equal(values.get("create-custom-sheet-title"), "Unfinished manual draft");
});
test("duplicate import does not write either snapshot or overwrite edited metadata", async () => {
  seed();
  const input = { title: "First", content: "# Exact source" };
  const first = await Service.importCustomCheatsheet(input);
  await Service.updateCustomCheatsheet(first.sheet.id, "Renamed", input.content, ["edited"], "Keep me");
  const before = new Map(values);
  const setItem = native.LocalStorage.setItem;
  native.LocalStorage.setItem = async () => {
    throw new Error("Duplicate must not attempt a write");
  };
  try {
    const result = await Service.importCustomCheatsheet({ ...input, title: "Other" });
    assert.equal(result.status, "duplicate");
    assert.equal(result.sheet.title, "Renamed");
    assert.deepEqual(result.sheet.tags, ["edited"]);
    assert.deepEqual(values, before);
  } finally {
    native.LocalStorage.setItem = setItem;
  }
});
test("same title different source imports independently; repository content is not a custom duplicate", async () => {
  seed();
  const a = await Service.importCustomCheatsheet({ title: "Same", content: "Old" });
  const b = await Service.importCustomCheatsheet({ title: "Same", content: "Old\n" });
  assert.equal(a.status, "created");
  assert.equal(b.status, "created");
  assert.notEqual(a.sheet.id, b.sheet.id);
  assert.equal((await Service.getCustomCheatsheets()).length, 2);
});
for (const key of [BACKUP_KEY, LIBRARY_KEY])
  test(`failed local import retains existing library: ${key}`, async () => {
    seed();
    const before = values.get(LIBRARY_KEY);
    failKey = key;
    await assert.rejects(Service.importCustomCheatsheet({ title: "New", content: "# New" }), /Cannot safely/);
    assert.equal(values.get(LIBRARY_KEY), before);
  });
test("local import retry detects a saved copy after lost write acknowledgement", async () => {
  seed();
  const input = { title: "New", content: "# New" };
  const setItem = native.LocalStorage.setItem;
  native.LocalStorage.setItem = async (key, value) => {
    await setItem(key, value);
    if (key === LIBRARY_KEY) throw new Error("Lost acknowledgement");
  };
  try {
    await assert.rejects(Service.importCustomCheatsheet(input), /Cannot safely/);
  } finally {
    native.LocalStorage.setItem = setItem;
  }
  assert.equal((await Service.importCustomCheatsheet(input)).status, "duplicate");
  assert.equal((await Service.getCustomCheatsheets()).length, 1);
});
test("local import rejects cancellation corruption and blank title without changing saved data", async () => {
  seed();
  const before = new Map(values);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(Service.importCustomCheatsheet({ title: "New", content: "# New" }, controller.signal), {
    name: "AbortError",
  });
  await assert.rejects(Service.importCustomCheatsheet({ title: " ", content: "# New" }), /required/);
  assert.deepEqual(values, before);
  values.set(LIBRARY_KEY, "broken");
  const corrupt = new Map(values);
  await assert.rejects(Service.importCustomCheatsheet({ title: "New", content: "# New" }), /Cannot safely/);
  assert.deepEqual(values, corrupt);
});
