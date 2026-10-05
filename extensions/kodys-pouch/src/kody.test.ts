import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeInventory, itemKey, pruneKeys, type Item } from "./pouch.ts";

test("loadSkills posts its operation to the Pouch webhook without bearer auth", async () => {
  const requests: Array<{
    url: string;
    headers: Headers;
    body: unknown;
  }> = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    requests.push({
      url,
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return new Response(JSON.stringify({ result: [] }), { status: 200 });
  };

  const { loadSkills, clearCatalogCaches } = await import("./kody.ts");
  clearCatalogCaches();
  await loadSkills();

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, "https://hooks.test/pouch");
  assert.deepEqual(requests[0]?.body, { operation: "list-skills" });
  assert.equal(requests[0]?.headers.get("authorization"), null);
  assert.match(
    requests[0]?.headers.get("idempotency-key") ?? "",
    /^raycast:pouch:list-skills:/,
  );
  assert.equal(
    requests.some((request) => request.url.includes("package-invocations")),
    false,
  );
});

test("skillGetImportSpec scopes the discovery fork under the pref username", async () => {
  const { skillGetImportSpec } = await import("./kody.ts");
  globalThis.__KODY_TEST_PREFS__ = {
    username: "janedoe",
    discoveryKodyId: "raycast-kodys-pouch",
  };
  assert.equal(
    skillGetImportSpec(),
    "kody:@janedoe/raycast-kodys-pouch/get-skill",
  );
  globalThis.__KODY_TEST_PREFS__ = {
    username: "janedoe",
    discoveryKodyId: "@janedoe/pouch-fork",
  };
  assert.equal(skillGetImportSpec(), "kody:@janedoe/pouch-fork/get-skill");
  delete globalThis.__KODY_TEST_PREFS__;
});

test("fetchSkillDocument posts its operation and id to the Pouch webhook", async () => {
  const urls: string[] = [];
  const bodies: unknown[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    bodies.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(
      JSON.stringify({
        result: `---
name: grill-with-docs
---

Body`,
      }),
      { status: 200 },
    );
  };

  const { fetchSkillDocument } = await import("./kody.ts");
  const result = await fetchSkillDocument("mattpocock-grill-with-docs");

  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(
      result.value,
      `---
name: grill-with-docs
---

Body`,
    );
  }
  assert.deepEqual(urls, ["https://hooks.test/pouch"]);
  assert.deepEqual(bodies, [
    { operation: "get-skill", id: "mattpocock-grill-with-docs" },
  ]);
});

test("fetchSkillDocument extracts SKILL.md from the files array", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        result: {
          id: "x",
          name: "x",
          files: [
            { path: "ATTRIBUTION.md", content: "by someone" },
            { path: "SKILL.md", content: "---\nname: x\n---\n\nBody" },
          ],
        },
      }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "---\nname: x\n---\n\nBody");
  }
});

test("fetchSkillDocument falls back to the only file when SKILL.md is absent", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        result: {
          id: "x",
          name: "x",
          files: [{ path: "notes.md", content: "Notes" }],
        },
      }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "Notes");
  }
});

test("fetchSkillDocument normalizes content field and fails on empty", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ result: { content: "---\nname: x\n---\n\nHi" } }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "---\nname: x\n---\n\nHi");
  }

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ result: { content: "   " } }), {
      status: 200,
    });
  const empty = await fetchSkillDocument("x");
  assert.equal(empty.status, "error");

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "nope" }), { status: 500 });
  const failed = await fetchSkillDocument("x");
  assert.equal(failed.status, "error");
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type RecordedPost = {
  operation: string;
  params: Record<string, unknown>;
  idempotencyKey: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubCatalogFetch(options: { failCapabilities?: boolean } = {}) {
  const posts: RecordedPost[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<
      string,
      unknown
    >;
    assert.equal(url, "https://hooks.test/pouch");
    const operation = String(body.operation ?? "");
    const params = { ...body };
    delete params.operation;
    posts.push({
      operation,
      params,
      idempotencyKey: new Headers(init?.headers).get("idempotency-key") ?? "",
    });
    if (operation === "list-skills") {
      return jsonResponse({
        result: [
          {
            name: "grill-with-docs",
            id: "mattpocock-grill-with-docs",
            description: "Grill a plan",
          },
        ],
      });
    }
    if (operation === "list-capabilities") {
      if (options.failCapabilities) {
        return jsonResponse({ error: "down" }, 500);
      }
      return jsonResponse({
        result: {
          capabilities: [
            {
              name: "package_list",
              description: "List saved packages",
              source: "builtin",
            },
          ],
        },
      });
    }
    if (operation === "list-packages") {
      return jsonResponse({
        result: { packages: [{ packageId: "pkg-1", kodyId: "skills" }] },
      });
    }
    if (operation === "get-package") {
      return jsonResponse({
        result: {
          kodyId: "skills",
          exports: [{ exportName: "skill-get", description: "Read a skill" }],
        },
      });
    }
    if (operation === "get-skill") {
      return jsonResponse({
        result: `---
name: grill-with-docs
---

Body`,
      });
    }
    return jsonResponse({ error: `unexpected ${operation}` }, 500);
  };
  return posts;
}

function catalogOperations(posts: RecordedPost[]): string[] {
  return posts.map((post) => post.operation);
}

function hasCatalogLists(posts: RecordedPost[]) {
  const names = new Set(catalogOperations(posts));
  return (
    names.has("list-skills") &&
    names.has("list-capabilities") &&
    names.has("list-packages")
  );
}

const grill: Item = {
  kind: "skill",
  name: "grill-with-docs",
  id: "mattpocock-grill-with-docs",
  description: "Grill a plan",
};

const skillGet: Item = {
  kind: "tool",
  parentKind: "package",
  name: "skill-get",
  description: "Read a skill",
  kodyId: "skills",
  exportName: "skill-get",
};

const packageList: Item = {
  kind: "tool",
  parentKind: "kody",
  name: "package_list",
  description: "List saved packages",
  capability: "package_list",
};

function wouldWriteLastGood(merged: { items: Item[]; errors: string[] }) {
  return merged.errors.length === 0 && merged.items.length > 0;
}

test("warm catalog does not POST skills, capabilities, or package-tools", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  await Promise.all([loadTools(), loadSkills()]);
  assert.equal(hasCatalogLists(posts), true);
  assert.equal(
    posts.some(
      (post) =>
        "query" in post.params || "search" in post.params || "q" in post.params,
    ),
    false,
    `search text is not a fetch argument, got: ${JSON.stringify(posts)}`,
  );
  posts.length = 0;
  await Promise.all([loadTools(), loadSkills()]);
  assert.deepEqual(catalogOperations(posts), []);
});

test("expiry or miss POSTs skills, capabilities, and package-tools again", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  const origin = 1_700_000_000_000;
  const realNow = Date.now;
  Date.now = () => origin;
  try {
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);

    posts.length = 0;
    Date.now = () => origin + SEVEN_DAYS_MS - 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.deepEqual(catalogOperations(posts), []);

    posts.length = 0;
    Date.now = () => origin + SEVEN_DAYS_MS + 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);

    posts.length = 0;
    clearCatalogCaches();
    Date.now = () => origin + SEVEN_DAYS_MS + 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);
  } finally {
    Date.now = realNow;
  }
});

test("Refresh POSTs the three lists again and leaves last-good, pins, and recents", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const lastGood = mergeInventory({ tools, skills }).items;
  const pinned = [itemKey(grill)];
  const recent = [itemKey(skillGet)];
  const firstKeys = posts
    .filter((post) => post.operation === "list-skills")
    .map((post) => post.idempotencyKey);

  posts.length = 0;
  clearCatalogCaches();
  const [refreshedTools, refreshedSkills] = await Promise.all([
    loadTools(),
    loadSkills(),
  ]);
  assert.equal(hasCatalogLists(posts), true);
  const refreshKeys = posts
    .filter((post) => post.operation === "list-skills")
    .map((post) => post.idempotencyKey);
  assert.notEqual(refreshKeys[0], firstKeys[0]);

  const refreshed = mergeInventory({
    tools: refreshedTools,
    skills: refreshedSkills,
    lastGood,
  });
  assert.deepEqual(pruneKeys(pinned, refreshed.items), pinned);
  assert.deepEqual(pruneKeys(recent, refreshed.items), recent);
});

test("failed capabilities after Refresh keep last-good tools and capability pins", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  stubCatalogFetch();
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const lastGood = mergeInventory({ tools, skills }).items;
  assert.equal(
    lastGood.some((item) => itemKey(item) === itemKey(packageList)),
    true,
  );
  const pinned = [itemKey(packageList)];
  assert.deepEqual(pruneKeys(pinned, lastGood), pinned);

  clearCatalogCaches();
  stubCatalogFetch({ failCapabilities: true });
  const [failedTools, refreshedSkills] = await Promise.all([
    loadTools(),
    loadSkills(),
  ]);
  assert.equal(failedTools.status, "error");
  const merged = mergeInventory({
    tools: failedTools,
    skills: refreshedSkills,
    lastGood,
  });
  assert.equal(wouldWriteLastGood(merged), false);
  assert.equal(
    merged.items.some((item) => itemKey(item) === itemKey(packageList)),
    true,
  );
  assert.deepEqual(pruneKeys(pinned, merged.items), pinned);
});

test("failed fetch after Refresh keeps last-good catalog", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  stubCatalogFetch();
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const lastGood = mergeInventory({ tools, skills }).items;
  assert.ok(lastGood.length > 0);

  clearCatalogCaches();
  globalThis.fetch = async () => jsonResponse({ error: "down" }, 500);
  const [failedTools, failedSkills] = await Promise.all([
    loadTools(),
    loadSkills(),
  ]);
  const merged = mergeInventory({
    tools: failedTools,
    skills: failedSkills,
    lastGood,
  });
  assert.deepEqual(merged.items, lastGood);
  assert.ok(merged.errors.length > 0);
});

test("catalog load does not POST skill contents; copy still does", async () => {
  const { loadSkills, loadTools, fetchSkillDocument, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  await Promise.all([loadTools(), loadSkills()]);
  assert.equal(
    posts.some((post) => post.operation === "get-skill"),
    false,
  );

  const loaded = await fetchSkillDocument("mattpocock-grill-with-docs");
  assert.equal(loaded.status, "ok");
  assert.equal(
    posts.some((post) => post.operation === "get-skill"),
    true,
  );
  assert.ok(
    posts.some(
      (post) =>
        post.operation === "get-skill" &&
        post.params.id === "mattpocock-grill-with-docs",
    ),
  );
});
