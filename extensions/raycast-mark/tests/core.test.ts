import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  AI_MAX_RESPONSE_BYTES,
  aiConfigFromPreferences,
  aiEndpoint,
  suggestMetadata,
} from "../src/ai.ts";
import type { AIConfig, AIProtocol } from "../src/ai.ts";
import {
  normalizeBookmarkUrl,
  resolveLaunchUrl,
  templateFields,
} from "../src/bookmark-utils.ts";
import {
  applyJsonImport,
  exportJson,
  previewJsonImport,
  saveJsonExport,
} from "../src/import-export.ts";
import {
  bookmarkMutation,
  canonical,
  catalogMutation,
  DEFAULT_LOCATION,
  deleteBookmark,
  emptyCatalog,
  MAX_EVENT_BYTES,
  removeCategory,
  restoreBookmark,
  TRASH_LOCATION,
} from "../src/model.ts";
import type { Bookmark, LibraryEvent, Mutation } from "../src/model.ts";
import {
  commit,
  configureDirectory,
  publishEvent,
  readLibrary,
  replayEvents,
  resolveConflicts,
} from "../src/repository.ts";

const bookmark = (id = "b1"): Bookmark => ({
  id,
  title: "示例",
  url: "https://example.test/?q={query}&lang={language}",
  desc: "说明",
  tags: ["tag", "中文"],
  pinned: true,
  allowUniversal: true,
  locations: [DEFAULT_LOCATION],
  createdAt: 100,
  updatedAt: 200,
  visits: 7,
  lastUsed: 300,
});
const event = (
  mutations: Mutation[],
  visits: LibraryEvent["visits"] = [],
): LibraryEvent => ({
  schemaVersion: 1,
  eventId: randomUUID(),
  occurredAt: Date.now(),
  mutations,
  visits,
});
const create = (b = bookmark()): LibraryEvent =>
  event([{ entity: "bookmark", entityId: b.id, baseHeads: [], value: b }]);
async function fixture(run: (dir: string, parent: string) => Promise<void>) {
  const parent = await fs.mkdtemp(path.join(process.cwd(), "tests/.marks-"));
  try {
    const dir = await configureDirectory(undefined, parent);
    await run(dir, parent);
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
}
async function raw(dir: string, e: LibraryEvent) {
  await fs.writeFile(
    path.join(dir, "events", `${e.eventId}.json`),
    JSON.stringify(e),
  );
}
function errorCode(code: string) {
  return (e: unknown) => (e as { code?: string }).code === code;
}

test("templateFields / resolveLaunchUrl: multiple parameters, safe encoding and authority rejection", () => {
  assert.deepEqual(
    templateFields("example.test/{查询}?a={lang}&again={查询}"),
    ["查询", "lang"],
  );
  assert.equal(
    resolveLaunchUrl("example.test/{query}?b={lang}", {
      query: "a/b &?",
      lang: "中#",
    }),
    "https://example.test/a%2Fb%20%26%3F?b=%E4%B8%AD%23",
  );
  assert.equal(resolveLaunchUrl("example.test"), "https://example.test");
  for (const url of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:pass@example.test",
    "https://{host}/",
    "https:///{host}/",
    "https:////{host}/",
    "https:///?host={host}",
    "{scheme}://example.test/",
    "https://example.test\\@evil.test",
    "https://example.test/{broken",
  ])
    assert.throws(() => normalizeBookmarkUrl(url));
  assert.throws(() => resolveLaunchUrl(bookmark().url, { query: "q" }));
});

test("Finder metadata is ignored; unknown files still block writes", async () =>
  fixture(async (dir, parent) => {
    await fs.writeFile(path.join(dir, ".DS_Store"), "Finder metadata");
    await fs.writeFile(
      path.join(dir, "events", ".DS_Store"),
      "Finder metadata",
    );
    assert.equal(await configureDirectory(dir, parent), dir);
    assert.equal((await readLibrary(dir)).status, "ready");
    await publishEvent(dir, create());
    assert.equal((await readLibrary(dir)).bookmarks.length, 1);
    await fs.writeFile(path.join(dir, "events", "unknown.json"), "{}");
    assert.equal((await readLibrary(dir)).status, "blocked");
    await fs.unlink(path.join(dir, "events", "unknown.json"));
    await fs.writeFile(path.join(dir, "unknown.txt"), "unknown");
    await assert.rejects(configureDirectory(dir, parent));
    assert.equal((await readLibrary(dir)).status, "blocked");
  }));

test("publishEvent: fsync + hard link never overwrite, cleanup failure is committed exactly once", async () =>
  fixture(async (dir) => {
    const e = create();
    await publishEvent(dir, e);
    await assert.rejects(
      publishEvent(dir, { ...e, occurredAt: e.occurredAt + 1 }),
      errorCode("WRITE_FAILED"),
    );
    assert.equal((await readLibrary(dir)).bookmarks[0].title, "示例");
    const visit = event([], [{ bookmarkId: "b1", usedAt: 1000 }]);
    const result = await publishEvent(dir, visit, async () => {
      throw new Error("simulated unlink failure");
    });
    assert.match(result.cleanupWarning!, /本地已写入/);
    assert.equal((await readLibrary(dir)).bookmarks[0].visits, 8);
    assert.equal((await readLibrary(dir)).bookmarks[0].visits, 8);
    assert.ok(
      (await fs.readdir(path.join(dir, "events"))).some((n) =>
        n.startsWith(".pending-"),
      ),
    );
    assert.equal(
      (await fs.stat(path.join(dir, "events", `${e.eventId}.json`))).mode &
        0o777,
      0o600,
    );
  }));

test("replayEvents: unordered events, duplicate delivery, concurrent create/edit/delete, explicit restore", async () =>
  fixture(async (dir) => {
    const initial = create();
    const start = replayEvents([initial]);
    const edit = event([
      bookmarkMutation(start, { ...start.bookmarks[0], title: "另一设备编辑" }),
    ]);
    const deletion = event([deleteBookmark(start, start.bookmarks[0])]);
    const conflicted = replayEvents([deletion, edit, initial, initial]);
    assert.equal(conflicted.status, "conflicted");
    assert.equal(conflicted.conflicts[0].candidates.length, 2);
    assert.equal(
      canonical(conflicted),
      canonical(replayEvents([initial, edit, deletion])),
    );
    assert.throws(
      () => replayEvents([initial, { ...initial, occurredAt: 0 }]),
      errorCode("CORRUPT"),
    );
    assert.equal(
      replayEvents([initial, create({ ...bookmark(), title: "same ID" })])
        .status,
      "conflicted",
    );
    await raw(dir, initial);
    await raw(dir, edit);
    await raw(dir, deletion);
    await assert.rejects(
      commit(dir, {
        mutations: [],
        visits: [{ bookmarkId: "b1", usedAt: 999 }],
        expectedHeads: conflicted.heads,
      }),
      errorCode("CONFLICT"),
    );
    const chosen = deletion.mutations[0];
    const resolved = await resolveConflicts(
      dir,
      [{ ...chosen, baseHeads: conflicted.heads["bookmark:b1"] }],
      conflicted.heads,
    );
    assert.equal(resolved.state.bookmarks[0].isDeleted, true);
    const restored = await commit(dir, {
      mutations: [restoreBookmark(resolved.state, resolved.state.bookmarks[0])],
      expectedHeads: resolved.state.heads,
    });
    assert.equal(restored.state.bookmarks[0].isDeleted, false);
    assert.deepEqual(restored.state.bookmarks[0].locations, [DEFAULT_LOCATION]);
    await assert.rejects(
      commit(dir, {
        mutations: [bookmarkMutation(start, bookmark())],
        expectedHeads: start.heads,
      }),
      errorCode("STALE_HEADS"),
    );
  }));

test("catalog references: atomic category removal and structural conflict resolution", async () =>
  fixture(async (dir) => {
    const empty = await readLibrary(dir);
    const catalog = emptyCatalog();
    catalog.groups.push({
      id: "g-work",
      name: "工作",
      createdAt: 0,
      updatedAt: 0,
      children: [{ id: "sg-work", name: "项目", createdAt: 0, updatedAt: 0 }],
    });
    const initial = event([
      catalogMutation(empty, catalog),
      bookmarkMutation(empty, bookmark()),
    ]);
    await raw(dir, initial);
    const start = await readLibrary(dir);
    const moved = event([
      bookmarkMutation(start, {
        ...bookmark(),
        locations: [{ groupId: "g-work", subGroupId: "sg-work" }],
      }),
    ]);
    const removed = event([catalogMutation(start, emptyCatalog())]);
    await raw(dir, moved);
    await raw(dir, removed);
    const conflict = await readLibrary(dir);
    assert.equal(conflict.status, "conflicted");
    assert.equal(conflict.conflicts[0].reason, "invalid-locations");
    await assert.rejects(
      resolveConflicts(
        dir,
        [bookmarkMutation(conflict, conflict.bookmarks[0])],
        conflict.heads,
      ),
      errorCode("CONFLICT"),
    );
    const result = await resolveConflicts(
      dir,
      [
        bookmarkMutation(conflict, {
          ...conflict.bookmarks[0],
          locations: [DEFAULT_LOCATION],
        }),
      ],
      conflict.heads,
    );
    assert.equal(result.state.status, "ready");
    const expanded = await commit(dir, {
      expectedHeads: result.state.heads,
      mutations: [
        catalogMutation(result.state, catalog),
        bookmarkMutation(result.state, {
          ...result.state.bookmarks[0],
          locations: [
            { groupId: "g-work", subGroupId: "sg-work" },
            DEFAULT_LOCATION,
          ],
        }),
      ],
    });
    const removal = removeCategory(expanded.state, "g-work");
    assert.equal(removal.affectedCount, 1);
    assert.equal(removal.mutations.length, 2);
    assert.throws(() => removeCategory(expanded.state, "g-default"));
    const removedState = await commit(dir, {
      expectedHeads: expanded.state.heads,
      mutations: removal.mutations,
    });
    assert.equal(removedState.state.status, "ready");
  }));

test("readLibrary: corrupt/missing parents/unknown schemas/cycles/invalid files block all writes", async () => {
  for (const kind of ["json", "parent", "schema", "cycle", "name", "unknown"])
    await fixture(async (dir) => {
      const a = create();
      if (kind === "json")
        await fs.writeFile(path.join(dir, "events", `${a.eventId}.json`), "{");
      else if (kind === "schema")
        await raw(dir, { ...a, schemaVersion: 2 } as unknown as LibraryEvent);
      else if (kind === "parent") {
        a.mutations[0].baseHeads = [randomUUID()];
        await raw(dir, a);
      } else if (kind === "cycle") {
        const b = create();
        a.mutations[0].baseHeads = [b.eventId];
        b.mutations[0].baseHeads = [a.eventId];
        await raw(dir, a);
        await raw(dir, b);
      } else if (kind === "name")
        await fs.writeFile(
          path.join(dir, "events", `${randomUUID()}.json`),
          JSON.stringify(a),
        );
      else
        await fs.writeFile(
          path.join(dir, "events", "icloud-conflict.json"),
          "{}",
        );
      const state = await readLibrary(dir);
      assert.equal(state.status, "blocked", kind);
      await assert.rejects(
        commit(dir, {
          expectedHeads: state.heads,
          mutations: [bookmarkMutation(state, bookmark())],
        }),
      );
    });
});

test("path boundaries: dedicated existing root, symlinks/events/temp/non-files, traversal IDs are never paths", async () =>
  fixture(async (dir, parent) => {
    const before = await readLibrary(dir);
    const b = bookmark("../../outside");
    await commit(dir, {
      expectedHeads: before.heads,
      mutations: [bookmarkMutation(before, b)],
    });
    assert.equal((await readLibrary(dir)).status, "ready");
    assert.equal((await fs.readdir(path.join(dir, "events"))).length, 1);
    await assert.rejects(
      configureDirectory(path.join(parent, "missing"), parent),
    );
    await assert.rejects(configureDirectory("relative", parent));
    const outside = path.join(parent, "outside");
    await fs.writeFile(outside, "secret");
    for (const filename of [
      `${randomUUID()}.json`,
      `.pending-${randomUUID()}.tmp`,
    ]) {
      const link = path.join(dir, "events", filename);
      await fs.symlink(outside, link);
      assert.equal((await readLibrary(dir)).status, "blocked");
      await fs.unlink(link);
    }
    const folder = path.join(dir, "events", `${randomUUID()}.json`);
    await fs.mkdir(folder);
    assert.equal((await readLibrary(dir)).status, "blocked");
    await fs.rmdir(folder);
    await fs.rename(path.join(dir, "events"), path.join(parent, "real-events"));
    await fs.symlink(
      path.join(parent, "real-events"),
      path.join(dir, "events"),
    );
    assert.equal((await readLibrary(dir)).status, "blocked");
    await assert.rejects(configureDirectory(dir, parent));
  }));

test("limits: oversized event/import rejects before writing", async () =>
  fixture(async (dir) => {
    const file = path.join(dir, "events", `${randomUUID()}.json`);
    const h = await fs.open(file, "wx");
    await h.truncate(MAX_EVENT_BYTES + 1);
    await h.close();
    const state = await readLibrary(dir);
    assert.equal(state.status, "blocked");
    assert.equal(
      state.issues[0].code,
      "LIMIT",
      JSON.stringify({ issues: state.issues, files: await fs.readdir(dir) }),
    );
    assert.throws(
      () =>
        previewJsonImport(" ".repeat(MAX_EVENT_BYTES + 1), replayEvents([])),
      errorCode("LIMIT"),
    );
  }));

function legacy() {
  const catalog = emptyCatalog();
  catalog.groups.push({
    id: "g-more",
    name: "更多",
    createdAt: 10,
    updatedAt: 20,
    children: [{ id: "sg-more", name: "工作", createdAt: 11, updatedAt: 21 }],
  });
  const live = {
    ...bookmark(),
    locations: [DEFAULT_LOCATION, { groupId: "g-more", subGroupId: "sg-more" }],
    icon: { type: "file" as const, path: "att:synthetic-only", fetchedAt: 123 },
    serverUpdatedAt: 201,
    isDeleted: false,
  };
  const deleted = {
    ...bookmark("deleted"),
    isDeleted: true,
    locations: [TRASH_LOCATION],
    prevLocations: live.locations,
    visits: 19,
  };
  const bookmarks = [live, deleted];
  return {
    groups: catalog.groups.map((g) => ({
      ...g,
      children: g.children.map((s) => ({
        ...s,
        bookmarkIds: bookmarks
          .filter((b) =>
            b.locations.some(
              (l) => l.groupId === g.id && l.subGroupId === s.id,
            ),
          )
          .map((b) => b.id),
      })),
    })),
    bookmarks,
  };
}

test("old JSON round trip: trash/prevLocations/multi-location/tags/pinned/times/usage/passive icon", async () =>
  fixture(async (dir, parent) => {
    const source = legacy();
    const plan = previewJsonImport(
      JSON.stringify(source),
      await readLibrary(dir),
    );
    assert.equal(plan.counts.attachments, 1);
    assert.match(plan.warnings.join(), /不读取/);
    const applied = await applyJsonImport(dir, plan, {});
    const exported = JSON.parse(exportJson(applied.state));
    assert.deepEqual(
      exported.bookmarks,
      source.bookmarks.sort((a, b) => a.id.localeCompare(b.id)),
    );
    assert.deepEqual(exported.groups, source.groups);
    assert.equal(exported.source, "raycast-marks");
    assert.ok(!exportJson(applied.state).includes("apiKey"));
    await saveJsonExport(dir, path.join(parent, "backup.json"));
    await assert.rejects(
      saveJsonExport(dir, path.join(parent, "backup.json")),
      errorCode("WRITE_FAILED"),
    );
    await assert.rejects(
      saveJsonExport(dir, path.join(dir, "backup.json")),
      errorCode("INVALID_INPUT"),
    );
    const newDir = path.join(parent, "another");
    await fs.mkdir(newDir);
    await configureDirectory(newDir, parent);
    const second = await applyJsonImport(
      newDir,
      previewJsonImport(JSON.stringify(exported), await readLibrary(newDir)),
      {},
    );
    assert.deepEqual(second.state.bookmarks, applied.state.bookmarks);
  }));

test("JSON merge requires per-ID choice, preserves usage base, no double visits or silent same-URL dedup", async () =>
  fixture(async (dir) => {
    const first = await applyJsonImport(
      dir,
      previewJsonImport(JSON.stringify(legacy()), await readLibrary(dir)),
      {},
    );
    const used = await commit(dir, {
      expectedHeads: first.state.heads,
      mutations: [],
      visits: [
        { bookmarkId: "b1", usedAt: 1000 },
        { bookmarkId: "b1", usedAt: 1100 },
      ],
    });
    const incoming = legacy();
    incoming.bookmarks[0].title = "导入新标题";
    incoming.bookmarks[0].visits = 0;
    const plan = previewJsonImport(JSON.stringify(incoming), used.state);
    assert.match(plan.warnings.join(), /导入统计不覆盖/);
    await assert.rejects(
      applyJsonImport(dir, plan, {}),
      errorCode("INVALID_INPUT"),
    );
    const applied = await applyJsonImport(dir, plan, {
      "bookmark:b1": "incoming",
    });
    assert.equal(applied.state.bookmarks.find((b) => b.id === "b1")!.visits, 9);
    assert.equal(
      applied.state.bookmarks.find((b) => b.id === "b1")!.lastUsed,
      1100,
    );
    assert.equal(
      previewJsonImport(JSON.stringify(incoming), applied.state).mutations
        .length,
      0,
    );
    const bad = bookmarkMutation(applied.state, applied.state.bookmarks[0]);
    (bad.value as Bookmark).visits = 999;
    await assert.rejects(
      commit(dir, { expectedHeads: applied.state.heads, mutations: [bad] }),
      errorCode("INVALID_INPUT"),
    );
    await assert.rejects(
      applyJsonImport(dir, plan, { "bookmark:b1": "incoming" }),
      errorCode("STALE_HEADS"),
    );
    const another = legacy();
    another.bookmarks[0].id = "new-id";
    for (const g of another.groups)
      for (const s of g.children)
        s.bookmarkIds = s.bookmarkIds.map((v) => (v === "b1" ? "new-id" : v));
    const newPlan = previewJsonImport(JSON.stringify(another), applied.state);
    assert.equal(newPlan.counts.sameUrl, 2);
    assert.ok(newPlan.mutations.some((m) => m.entityId === "new-id"));
  }));

test("JSON rejects secrets, unknown versions, duplicate IDs, invalid times/URL/references/index conflicts", () => {
  const empty = replayEvents([]);
  for (const change of [
    (v: ReturnType<typeof legacy>) =>
      Object.assign(v, { settings: { apiKey: "do-not-echo" } }),
    (v: ReturnType<typeof legacy>) => Object.assign(v, { schemaVersion: 2 }),
    (v: ReturnType<typeof legacy>) => v.bookmarks.push(v.bookmarks[0]),
    (v: ReturnType<typeof legacy>) => {
      v.bookmarks[0].createdAt = -1;
    },
    (v: ReturnType<typeof legacy>) => {
      v.bookmarks[0].url = "javascript:alert(1)";
    },
    (v: ReturnType<typeof legacy>) => {
      v.bookmarks[0].locations = [];
    },
    (v: ReturnType<typeof legacy>) => {
      v.groups[0].children[0].bookmarkIds.push("missing");
    },
  ]) {
    const input = legacy();
    change(input);
    assert.throws(
      () => previewJsonImport(JSON.stringify(input), empty),
      (e: unknown) => e instanceof Error && !e.message.includes("do-not-echo"),
    );
  }
  assert.throws(() => exportJson({ ...empty, status: "blocked" }));
  assert.throws(() => exportJson({ ...empty, status: "conflicted" }));
  const missing = {
    groups: [],
    bookmarks: [{ title: "new", url: "example.test", tags: [] }],
  };
  const plan = previewJsonImport(JSON.stringify(missing), empty);
  assert.equal(plan.counts.generatedIds, 1);
  assert.equal(plan.counts.missingTimes, 2);
});

test("AI: three non-stream protocols, independent keys, endpoint/headers/body and validated suggestions", async () => {
  const original = globalThis.fetch;
  try {
    for (const protocol of [
      "openai-responses",
      "openai-compatible",
      "anthropic",
    ] as AIProtocol[]) {
      const config: AIConfig = {
        protocol,
        baseUrl: "https://provider.test/v1",
        model: "model",
        apiKey: "synthetic-key",
      };
      globalThis.fetch = async (input, init) => {
        const suffix =
          protocol === "anthropic"
            ? "/messages"
            : protocol === "openai-responses"
              ? "/responses"
              : "/chat/completions";
        assert.equal(input, config.baseUrl + suffix);
        assert.equal(init?.redirect, "error");
        assert.equal(init?.method, "POST");
        const headers = init?.headers as Record<string, string>;
        const body = JSON.parse(init?.body as string);
        assert.equal(body.stream, false);
        assert.equal(body.model, "model");
        assert.ok(!JSON.stringify(body).includes("synthetic-key"));
        assert.ok(!JSON.stringify(body).includes("not-selected"));
        if (protocol === "anthropic") {
          assert.equal(headers["x-api-key"], "synthetic-key");
          assert.equal(headers["anthropic-version"], "2023-06-01");
          assert.ok(body.system);
          assert.ok(body.max_tokens);
        } else assert.equal(headers.Authorization, "Bearer synthetic-key");
        const answer = JSON.stringify({
          title: "建议",
          desc: "说明",
          tags: ["a"],
        });
        return Response.json(
          protocol === "anthropic"
            ? { content: [{ type: "text", text: answer }] }
            : protocol === "openai-compatible"
              ? { choices: [{ message: { content: answer } }] }
              : {
                  output: [
                    {
                      type: "message",
                      content: [{ type: "output_text", text: answer }],
                    },
                  ],
                },
        );
      };
      assert.deepEqual(await suggestMetadata(config, { title: "selected" }), {
        title: "建议",
        desc: "说明",
        tags: ["a"],
      });
    }
    assert.equal(
      aiConfigFromPreferences({
        aiProtocol: "anthropic",
        anthropicKey: "a",
        openaiResponsesKey: "b",
      }).apiKey,
      "a",
    );
    for (const baseUrl of [
      "http://remote.test",
      "https://u:p@host.test",
      "https://host.test?key=secret",
      "file:///tmp",
    ])
      assert.throws(() =>
        aiEndpoint({ protocol: "anthropic", baseUrl, model: "m", apiKey: "k" }),
      );
    assert.equal(
      aiEndpoint({
        protocol: "anthropic",
        baseUrl: "http://127.0.0.1:1234/v1",
        model: "m",
        apiKey: "k",
      }),
      "http://127.0.0.1:1234/v1",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("AI: no auth/rate/network fallback, explicit unsupported fallback, safe errors/size/cancel/timeout", async () => {
  const original = globalThis.fetch;
  const config: AIConfig = {
    protocol: "openai-responses",
    baseUrl: "https://provider.test/v1",
    model: "m",
    apiKey: "secret-value",
  };
  try {
    for (const status of [401, 429, 500, 404]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response("secret-value raw response", { status });
      };
      await assert.rejects(
        suggestMetadata(config, { title: "t" }),
        (e: unknown) =>
          e instanceof Error && !e.message.includes("secret-value"),
      );
      assert.equal(calls, 1);
    }
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return calls === 1
        ? new Response(null, { status: 405 })
        : Response.json({
            choices: [{ message: { content: '{"title":"ok"}' } }],
          });
    };
    assert.equal((await suggestMetadata(config, { title: "t" })).title, "ok");
    assert.equal(calls, 2);
    globalThis.fetch = async () => {
      throw new Error("secret-value network request");
    };
    await assert.rejects(
      suggestMetadata(config, { title: "t" }),
      (e: unknown) => e instanceof Error && !e.message.includes("secret-value"),
    );
    globalThis.fetch = async () =>
      Response.json({
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: '{"apiKey":"secret-value"}' },
            ],
          },
        ],
      });
    await assert.rejects(suggestMetadata(config, { title: "t" }));
    globalThis.fetch = async () =>
      new Response("x".repeat(AI_MAX_RESPONSE_BYTES + 1));
    await assert.rejects(suggestMetadata(config, { title: "t" }), /过大/);
    globalThis.fetch = async () => new Promise(() => undefined);
    await assert.rejects(
      suggestMetadata(config, { title: "t" }, AbortSignal.timeout(5)),
      /取消或超时/,
    );
    await assert.rejects(
      suggestMetadata({ ...config, apiKey: "" }, { title: "t" }),
      /API Key/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("event trust boundary: empty/duplicate mutations, duplicate parents and cross-entity dependency cycles", () => {
  assert.throws(() => replayEvents([event([])]));
  const a = create();
  assert.throws(() => replayEvents([event([a.mutations[0], a.mutations[0]])]));
  const b = create();
  b.mutations[0].baseHeads = [a.eventId, a.eventId];
  assert.throws(() => replayEvents([a, b]));
  const first = event([
    {
      entity: "catalog",
      entityId: "catalog",
      baseHeads: [],
      value: emptyCatalog(),
    },
    create().mutations[0],
  ]);
  const second = event([
    {
      entity: "catalog",
      entityId: "catalog",
      baseHeads: [first.eventId],
      value: emptyCatalog(),
    },
    create().mutations[0],
  ]);
  first.mutations[1].baseHeads = [second.eventId];
  assert.throws(() => replayEvents([first, second]), errorCode("CORRUPT"));
});

test("directory event-count and aggregate-byte ceilings block writes", async () =>
  fixture(async (dir) => {
    const events = path.join(dir, "events");
    for (let batch = 0; batch < 101; batch++)
      await Promise.all(
        Array.from({ length: batch === 100 ? 1 : 100 }, () =>
          fs.writeFile(path.join(events, `${randomUUID()}.json`), "{}"),
        ),
      );
    let state = await readLibrary(dir);
    assert.equal(state.status, "blocked");
    assert.equal(
      state.issues[0].code,
      "LIMIT",
      JSON.stringify({ issues: state.issues, files: await fs.readdir(dir) }),
    );
    for (const name of await fs.readdir(events))
      await fs.unlink(path.join(events, name));
    // Valid ~10 MiB padded events make the cumulative limit measurable without allocating a huge entity.
    const initial = create();
    for (let i = 0; i < 11; i++) {
      const e = i ? event([], [{ bookmarkId: "b1", usedAt: i }]) : initial;
      const content = JSON.stringify(e);
      await fs.writeFile(
        path.join(events, `${e.eventId}.json`),
        content + " ".repeat(MAX_EVENT_BYTES - Buffer.byteLength(content)),
      );
    }
    state = await readLibrary(dir);
    assert.equal(state.status, "blocked");
    assert.equal(
      state.issues[0].code,
      "LIMIT",
      JSON.stringify({ issues: state.issues, files: await fs.readdir(dir) }),
    );
  }));

test("AI internal timeout bounds a transport ignoring cancellation", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Promise(() => undefined);
    await assert.rejects(
      suggestMetadata(
        {
          protocol: "anthropic",
          baseUrl: "https://provider.test/v1",
          model: "m",
          apiKey: "synthetic",
        },
        { title: "test" },
      ),
      /取消或超时/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
