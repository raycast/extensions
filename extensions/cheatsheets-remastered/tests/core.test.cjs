const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { stripFrontmatter, displayMarkdown } = require("../.test-dist/markdown");
const { LibraryStore, LIBRARY_KEY, BACKUP_KEY, LEGACY_KEYS } = require("../.test-dist/storage");
const { repositorySheetId, migrateIdentities } = require("../.test-dist/identity");
const { stageRepository, includeRepositoryFile, SYNC_LIMITS, githubGet } = require("../.test-dist/repository-sync");
const { partitionTitleMatches } = require("../.test-dist/search");
const { DraftSession } = require("../.test-dist/drafts");
const repo = {
  id: "r1",
  owner: "Example",
  name: "notes",
  defaultBranch: "feature/docs",
  url: "https://github.com/Example/notes",
  isPrivate: false,
  addedAt: 1,
};
const sheet = {
  id: "old-random-id",
  repositoryId: "r1",
  slug: "docs/git",
  title: "Git",
  content: "# Git\n",
  filePath: "docs/git.md",
  syncedAt: 1,
};
const empty = () => ({
  version: 2,
  custom: [],
  repositories: [],
  sheets: [],
  favorites: [],
  hidden: [],
  views: [],
  unresolvedLegacyKeys: [],
});
function serialLock() {
  let queue = Promise.resolve();
  return (fn) => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };
}
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    getItem: async (k) => values.get(k),
    setItem: async (k, v) => {
      writes.push(k);
      values.set(k, v);
    },
    removeItem: async (k) => {
      writes.push(k);
      values.delete(k);
    },
  };
}
for (const [label, source, body = source] of [
  ["absent", "# Git\nFirst two characters stay"],
  ["valid", "---\ntitle: Git\n---\n# Git", "# Git"],
  ["BOM and CRLF", "\uFEFF---\r\ntitle: 日本語\r\n---\r\n# 😀\r\n", "# 😀\r\n"],
  ["unclosed", "---\ntitle: Git\n# Body"],
  ["malformed", "---\ntitle: [broken\n---\nBody"],
  ["duplicate keys", "---\ntitle: A\ntitle: B\n---\nBody"],
  ["horizontal rules", "---\nOrdinary prose\n---\nBody"],
  ["empty block", "---\n---\nBody"],
  ["later delimiter", "First\n---\ntitle: Literal\n---\n"],
  ["fenced metadata", "```yaml\n---\ntitle: Example\n---\n```"],
  ["delimiter text", "---inline\ntitle: x\n---\n"],
  ["Unicode", "日本語 😀\nRésumé"],
])
  test(`Markdown: ${label}`, () => assert.equal(stripFrontmatter(source), body));
test("Markdown tables, generic types, HTML, links and fenced Jekyll are preserved", () => {
  const content =
    "| A | B |\n| - | - |\n| 1 | 2 |\n\n```html\n<details><summary>Example</summary><T></details>\n{: .literal}\n{%raw%}\n```\n\n`Array<T>` <https://example.com> <tag>literal</tag>\n";
  assert.equal(displayMarkdown(content), content);
  assert.equal(displayMarkdown(content, true), content);
  assert.equal(displayMarkdown("{: .-intro}\n# Title\n", true), "# Title\n");
});
test("stable IDs distinguish repository, branch, path and preserve owner case equivalence", () => {
  const a = repositorySheetId(repo, "docs/git.md");
  assert.equal(a, repositorySheetId({ ...repo, owner: "example" }, "docs/git.md"));
  for (const r of [
    { ...repo, name: "other" },
    { ...repo, defaultBranch: "main" },
  ])
    assert.notEqual(a, repositorySheetId(r, "docs/git.md"));
  assert.notEqual(a, repositorySheetId(repo, "docs/Git.md"));
  assert.notEqual(repositorySheetId(repo, "a:b.md"), repositorySheetId(repo, "a%3Ab.md"));
});
test("migration assigns only unique legacy keys and is idempotent", () => {
  const data = {
    ...empty(),
    repositories: [repo],
    sheets: [sheet],
    favorites: [{ id: "f", type: "repository", slug: "docs/git", title: "Git", favoritedAt: 1 }],
    views: [
      { key: "repository:docs/git", type: "repository", slug: "docs/git", title: "Git", count: 4, lastViewedAt: 1 },
    ],
  };
  const first = migrateIdentities(structuredClone(data));
  assert.equal(first.favorites[0].slug, repositorySheetId(repo, sheet.filePath));
  assert.equal(first.views[0].count, 4);
  assert.deepEqual(migrateIdentities(structuredClone(first)), first);
  const ambiguous = migrateIdentities({
    ...structuredClone(data),
    repositories: [repo, { ...repo, id: "r2", name: "other" }],
    sheets: [sheet, { ...sheet, id: "other-old", repositoryId: "r2" }],
  });
  assert.equal(ambiguous.favorites[0].slug, "docs/git");
  assert.deepEqual(ambiguous.unresolvedLegacyKeys, ["repository:docs/git"]);
});
test("legacy reads do not write; first mutation preserves original legacy data", async () => {
  const raw = JSON.stringify([repo]);
  const port = storage({ [LEGACY_KEYS.repositories]: raw, [LEGACY_KEYS.sheets]: JSON.stringify([sheet]) });
  const store = new LibraryStore(port, serialLock());
  await store.read();
  assert.equal(port.writes.length, 0);
  await store.update((d) => {
    d.repositories[0].description = "New";
  });
  assert.equal(port.values.get(LEGACY_KEYS.repositories), raw);
  assert.ok(port.values.has(BACKUP_KEY));
  assert.equal((await store.read()).repositories[0].description, "New");
});
for (const corrupt of ["", "[", "null", "{}", '[{"id":"broken"}]']) {
  test(`corrupt legacy storage blocks mutations: ${corrupt}`, async () => {
    const port = storage({ [LEGACY_KEYS.custom]: corrupt });
    const store = new LibraryStore(port, serialLock());
    await assert.rejects(
      store.update((d) => {
        d.custom = [];
      }),
      /Cannot safely/,
    );
    assert.equal(port.values.get(LEGACY_KEYS.custom), corrupt);
    assert.equal(port.writes.length, 0);
  });
}
test("read failures and corrupt v2 never fall back to empty or backup", async () => {
  const port = storage({ [LIBRARY_KEY]: "broken", [BACKUP_KEY]: JSON.stringify(empty()) });
  const store = new LibraryStore(port, serialLock());
  await assert.rejects(
    store.update(() => {}),
    /Cannot safely/,
  );
  port.getItem = async () => {
    throw new Error("device failure");
  };
  await assert.rejects(store.update(() => {}));
  assert.equal(port.writes.length, 0);
});
for (const failureKey of [BACKUP_KEY, LIBRARY_KEY])
  test(`write failure retains prior snapshot and timestamp: ${failureKey}`, async () => {
    const before = { ...empty(), repositories: [{ ...repo, lastSyncedAt: 10 }], sheets: [sheet] };
    const raw = JSON.stringify(before);
    const port = storage({ [LIBRARY_KEY]: raw });
    const set = port.setItem;
    port.setItem = async (k, v) => {
      if (k === failureKey) throw new Error("full");
      return set(k, v);
    };
    const store = new LibraryStore(port, serialLock());
    await assert.rejects(
      store.update((d) => {
        d.sheets = [];
        d.repositories[0].lastSyncedAt = 20;
      }),
    );
    assert.equal(port.values.get(LIBRARY_KEY), raw);
  });
test("cancellation between backup and commit preserves saved data", async () => {
  const port = storage({ [LIBRARY_KEY]: JSON.stringify(empty()) });
  const controller = new AbortController();
  const set = port.setItem;
  port.setItem = async (k, v) => {
    await set(k, v);
    if (k === BACKUP_KEY) controller.abort();
  };
  await assert.rejects(
    new LibraryStore(port, serialLock()).update((d) => d.repositories.push(repo), controller.signal),
  );
  assert.deepEqual(JSON.parse(port.values.get(LIBRARY_KEY)), empty());
});
test("concurrent read-modify-write operations do not lose updates", async () => {
  const port = storage();
  const lock = serialLock();
  const stores = [new LibraryStore(port, lock), new LibraryStore(port, lock)];
  await Promise.all(
    Array.from({ length: 30 }, (_, i) => stores[i % 2].update((d) => d.repositories.push({ ...repo, id: `r${i}` }))),
  );
  assert.equal((await stores[0].read()).repositories.length, 30);
});
function remote(files = { "docs/git.md": "# Git\n", "docs/other.md": "# Other\n" }) {
  const revision = "a".repeat(40),
    treeSha = "b".repeat(40);
  const blobs = new Map();
  const tree = Object.entries(files).map(([path, content]) => {
    const bytes = Buffer.from(content);
    const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    blobs.set(hash, { sha: hash, encoding: "base64", content: bytes.toString("base64"), size: bytes.length });
    return { path, sha: hash, type: "blob", mode: "100644", size: bytes.length };
  });
  const calls = [];
  const get = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("/commits/")) return { sha: revision, commit: { tree: { sha: treeSha } } };
    if (url.includes("/git/trees/")) return { sha: treeSha, tree, truncated: false };
    if (url.includes("/git/blobs/")) return blobs.get(url.split("/").pop());
    throw new Error("Unexpected request");
  };
  return { get, calls, tree, blobs, revision, treeSha };
}
test("sync encodes branch, pins commit/tree/blobs and preserves bytes", async () => {
  const content = "\uFEFF# Café 😀\r\n<T>\r\n";
  const mock = remote({ "docs/a b#.md": content });
  const result = await stageRepository(repo, undefined, undefined, mock.get);
  assert.equal(result.sheets[0].content, content);
  assert.match(mock.calls[0].url, /commits\/feature%2Fdocs$/);
  assert.ok(mock.calls[1].url.includes(mock.treeSha));
  assert.equal(result.revision, mock.revision);
  assert.equal(result.sheets[0].id, repositorySheetId(repo, "docs/a b#.md"));
});
for (const bad of [{ truncated: true }, { tree: undefined }, { tree: null }, { tree: [{ path: "docs/bad.md" }] }])
  test(`incomplete trees are rejected: ${JSON.stringify(bad)}`, async () => {
    const mock = remote();
    const get = async (u, o) => {
      const result = await mock.get(u, o);
      return u.includes("/git/trees/") ? { ...result, ...bad } : result;
    };
    await assert.rejects(stageRepository(repo, undefined, undefined, get));
    assert.equal(mock.calls.length, 2);
  });
test("successful empty selection differs from incomplete response", async () => {
  const mock = remote({ "README.md": "Read me" });
  const result = await stageRepository(repo, undefined, undefined, mock.get);
  assert.deepEqual(result.sheets, []);
  assert.equal(mock.calls.length, 2);
});
test("download failure, cancellation and integrity mismatch reject entire staging", async () => {
  for (const mode of ["failure", "cancel", "corrupt"]) {
    const mock = remote();
    const controller = new AbortController();
    let blobs = 0;
    const get = async (u, o) => {
      const result = await mock.get(u, o);
      if (u.includes("/git/blobs/") && ++blobs === 2) {
        if (mode === "failure") throw new Error("network disconnected");
        if (mode === "cancel") controller.abort();
        if (mode === "corrupt") return { ...result, content: Buffer.from("wrong").toString("base64") };
      }
      return result;
    };
    await assert.rejects(stageRepository(repo, undefined, controller.signal, get));
  }
});
test("size and count bounds reject before downloading", async () => {
  for (const kind of ["size", "count", "total"]) {
    const mock = remote();
    if (kind === "size") mock.tree[0].size = SYNC_LIMITS.fileBytes + 1;
    if (kind === "count")
      mock.tree.splice(
        0,
        2,
        ...Array.from({ length: SYNC_LIMITS.files + 1 }, (_, i) => ({ ...mock.tree[0], path: `${i}.md` })),
      );
    if (kind === "total")
      mock.tree.splice(
        0,
        2,
        ...Array.from({ length: 21 }, (_, i) => ({ ...mock.tree[0], path: `${i}.md`, size: SYNC_LIMITS.fileBytes })),
      );
    await assert.rejects(stageRepository(repo, undefined, undefined, mock.get));
    assert.equal(mock.calls.length, 2);
  }
});
test("file exclusions retain underscore-in-name sheets and handle dotted names", () => {
  assert.equal(includeRepositoryFile("cheatsheets/AJAX_Security_Cheat_Sheet.md"), true);
  assert.equal(includeRepositoryFile("docs/git.v2.MD"), true);
  assert.equal(includeRepositoryFile("docs/_internal.md"), false);
  assert.equal(includeRepositoryFile("README.md"), false);
  assert.equal(includeRepositoryFile("docs2/git.md", "docs"), false);
});
test("title priority applies to all types, preserves order and deduplicates identities", () => {
  const content = { id: "c", type: "custom", title: "Other" };
  const r1 = { id: "r1", type: "repository", title: "Git" },
    r2 = { ...r1, id: "r2" };
  const custom = { id: "c2", type: "custom", title: "Git guide" },
    bundled = { id: "git", type: "default", title: "git" };
  assert.deepEqual(partitionTitleMatches([content, r1, r2, custom, bundled, r1], " git "), {
    titles: [r1, r2, custom, bundled],
    content: [content],
  });
});
test("draft typing then clear cannot resurrect stale data; empty drafts are restored", async () => {
  const port = storage({ draft: "" });
  const draft = new DraftSession(port, serialLock(), "draft", "default");
  assert.equal(await draft.load(), "");
  await Promise.all([draft.save("first"), draft.save("second"), draft.save()]);
  assert.equal(port.values.has("draft"), false);
});
test("draft load failure and simultaneous editor conflict never overwrite saved data", async () => {
  const port = storage({ draft: "saved" });
  const lock = serialLock();
  const first = new DraftSession(port, lock, "draft", ""),
    second = new DraftSession(port, lock, "draft", "");
  await first.load();
  await second.load();
  await first.save("changed");
  await assert.rejects(second.save("stale"), /another command/);
  assert.equal(port.values.get("draft"), "changed");
  const broken = new DraftSession(
    {
      ...port,
      getItem: async () => {
        throw new Error("read failed");
      },
    },
    lock,
    "draft",
    "",
  );
  await assert.rejects(broken.load());
  await assert.rejects(broken.save("new"));
  assert.equal(port.values.get("draft"), "changed");
});
test("HTTP auth, rate-limit and timeout errors are actionable and redact credentials", async () => {
  const axios = require("axios");
  const saved = axios.get;
  try {
    for (const [status, code, expected] of [
      [401, null, /authentication/],
      [403, null, /rate limited/],
      [429, null, /rate limited/],
      [404, null, /not found/],
      [null, "ECONNABORTED", /timed out/],
    ]) {
      axios.get = async () => {
        throw Object.assign(new Error("secret-token private-content"), {
          isAxiosError: true,
          response: { status },
          code,
          config: { headers: { Authorization: "secret-token" } },
        });
      };
      await assert.rejects(
        githubGet("https://api.github.com/mock", {
          signal: new AbortController().signal,
          token: "secret-token",
          maxBytes: 20,
        }),
        (error) =>
          expected.test(error.message) &&
          !JSON.stringify(error).includes("secret-token") &&
          !error.message.includes("private-content"),
      );
    }
  } finally {
    axios.get = saved;
  }
});
module.exports = { repo, sheet, empty, storage, remote };
const { sheetSections } = require("../.test-dist/sections");
test("section search retains exact source slices, hierarchy and repeated headings", () => {
  const source =
    "---\r\ntitle: Guide\r\n---\r\n# Guide\r\nIntro 😀\r\n## Git\r\n<T>\r\n```md\r\n## Not a heading\r\n```\r\n## Git\r\nFinal\r\n";
  const sections = sheetSections(source);
  assert.deepEqual(
    sections.map((s) => s.title),
    ["Guide", "Git", "Git"],
  );
  assert.equal(sections[1].context, "Guide");
  assert.equal(sections[1].line, 6);
  assert.notEqual(sections[1].id, sections[2].id);
  assert.equal(sections.map((s) => s.source).join(""), stripFrontmatter(source));
  assert.ok(sections[1].source.includes("## Not a heading"));
});
test("sections support setext headings, preamble and unclosed code fences", () => {
  const source = "Introduction\n\nHeading\n=======\nText\n\n## Next\n~~~md\n# literal\n";
  assert.deepEqual(
    sheetSections(source).map((s) => s.title),
    ["Introduction", "Heading", "Next"],
  );
  assert.equal(
    sheetSections(source)
      .map((s) => s.source)
      .join(""),
    source,
  );
  assert.deepEqual(sheetSections("No headings\r\n"), [
    { id: "0", title: "Entire sheet", context: "", line: 1, source: "No headings\r\n" },
  ]);
});
test("real filesystem lock serialises independent command processes", async () => {
  const fs = require("node:fs/promises"),
    os = require("node:os"),
    path = require("node:path");
  const { spawn } = require("node:child_process");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cheatsheets-lock-test-"));
  try {
    await fs.writeFile(path.join(dir, "counter.json"), "0");
    await Promise.all(
      Array.from(
        { length: 3 },
        () =>
          new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [path.resolve("tests/lock-worker.cjs"), dir], { stdio: "ignore" });
            child.on("error", reject);
            child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}`))));
          }),
      ),
    );
    assert.equal(JSON.parse(await fs.readFile(path.join(dir, "counter.json"), "utf8")), 24);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test("mistyped subdirectory cannot replace a good snapshot with an empty selection", async () => {
  const mock = remote();
  await assert.rejects(
    stageRepository({ ...repo, subdirectory: "missing" }, undefined, undefined, mock.get),
    /Subdirectory not found/,
  );
  assert.equal(mock.calls.length, 2);
});
