import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { commandState, discover, Failure, getBookmark, queryAll, rpc, submit } from "../src/helper";
import { findSaved } from "../src/helpers/duplicates";
import { editBaseline, prepareEdit, prepareTrash, preflightEdit } from "../src/helpers/edit";
import { prepareNewBookmarks, prepareSave } from "../src/helpers/save";
import { PENDING_KEY, SubmissionController } from "../src/helpers/submission";
import { isolatedLibrary, memoryStore } from "./fixtures/library";

test("form creation path preserves complete URLs and independent titles; duplicate batches write nothing", async () => {
  const f = await isolatedLibrary();
  try {
    const { session } = f;
    const controller = new SubmissionController(memoryStore());
    const entries = [{ url: "https://example.org/中文/a,b;c?x=1%26b%3D2", title: "中文标题" }, { url: "https://example.net/other", title: "Second" }];
    const outcome = await controller.start("create", () => prepareNewBookmarks({ entries, note: "shared", tags: [] }, session));
    assert.equal(outcome.kind, "committed");
    const rows = await queryAll(session);
    assert.equal(rows.total, 2);
    for (const entry of entries) assert.ok(rows.items.some(row => row.values.url === entry.url && row.values.title === entry.title && row.values.note === "shared"));
    for (const inputs of [
      [entries[0], { url: "https://new.example.org" }],
      [{ url: "https://new.example.org/x" }, { url: "http://www.new.example.org/x/" }],
      [{ url: "https://new.example.org/x https://other.example.org" }],
    ]) {
      const before = await queryAll(session);
      assert.equal((await controller.start("create", () => prepareNewBookmarks({ entries: inputs, tags: [] }, session))).kind, "rejected");
      assert.equal((await queryAll(session)).revision, before.revision);
      assert.equal(await controller.record, undefined);
    }
    const id = rows.items[0].id;
    assert.equal((await findSaved(session, [String(rows.items[0].values.url)], undefined, id)).length, 0);
    // Existing source helper owns pinyin indexing; no index code is added to the plugin.
    assert.ok((await queryAll(session, { q: "zhongwenbiaoti" })).items.some(row => row.values.title === "中文标题"));
    assert.ok((await queryAll(session, { q: "zwbt" })).items.some(row => row.values.title === "中文标题"));
  } finally { f.cleanup(); }
});

test("duplicate matching covers stored raw spellings and keeps encoded query boundaries", async () => {
  const f = await isolatedLibrary();
  try {
    for (const [stored, equivalent] of [
      ["https://example.org:443/a", "https://example.org/a"],
      ["https://example.org/a/../b", "https://example.org/b"],
      ["https://%65xample.org/c", "https://example.org/c"],
      ["https://例子.测试/中文", "https://xn--fsqu00a.xn--0zwm56d/%E4%B8%AD%E6%96%87"],
    ]) {
      await submit(prepareSave({ entries: [{ url: stored }], tags: [] }, randomUUID(), f.session));
      assert.equal((await findSaved(f.session, [equivalent])).length, 1, stored);
    }
    await submit(prepareSave({ entries: [{ url: "https://example.org/query?a=1%26b%3D2" }], tags: [] }, randomUUID(), f.session));
    assert.equal((await findSaved(f.session, ["https://example.org/query?a=1&b=2"])).length, 0);
  } finally { f.cleanup(); }
});

test("not-found recovery preserves frozen heads, supports cancellation and reports concurrent changes", async () => {
  const f = await isolatedLibrary();
  try {
    for (const concurrent of ["title", "trash", "conflict", "purge"] as const) {
      const saved = prepareSave({ entries: [{ url: `https://example.org/${concurrent}`, title: "Original" }], tags: [] }, randomUUID(), f.session);
      await submit(saved);
      const entity = await getBookmark(f.session, saved.command.edits[0].entity);
      const baseline = editBaseline(entity);
      const pending = prepareEdit(entity, baseline, { ...baseline, title: "Pending title" }, randomUUID(), f.session, {})!;
      await preflightEdit(pending);
      if (concurrent === "title" || concurrent === "conflict") {
        const changed = prepareEdit(entity, baseline, { ...baseline, title: "Concurrent title" }, randomUUID(), f.session, {})!;
        await submit(changed);
        if (concurrent === "conflict") await submit({ ...changed, command: { ...changed.command, id: randomUUID(), edits: [{ ...changed.command.edits[0], values: { ...changed.command.edits[0].values, title: "Another title" } }] } });
      } else {
        const change = prepareTrash(entity, randomUUID(), f.session);
        if (concurrent === "purge") change.command.edits[0].values.life = "purged";
        await submit(change);
      }
      const store = memoryStore();
      const raw = JSON.stringify({ command: pending.command, libraryId: f.session.libraryId, entities: [entity.id], mode: "edit", phase: "execute" });
      await store.setItem(PENDING_KEY, raw);
      const controller = new SubmissionController(store);
      const before = await queryAll(f.session);
      const cancelled = await controller.recover(f.session, async () => { throw new Failure("CANCELLED", "cancel"); });
      assert.equal(cancelled.kind, "pending");
      assert.equal(await store.getItem(PENDING_KEY), raw);
      assert.equal((await queryAll(f.session)).revision, before.revision);
      let confirmed = false;
      const outcome = await controller.recover(f.session, async () => { confirmed = true; });
      assert.equal(confirmed, true);
      assert.equal(outcome.kind, ["conflict", "purge"].includes(concurrent) ? "rejected" : "committed-conflict", concurrent);
      assert.equal(await store.getItem(PENDING_KEY), undefined);
      if (outcome.kind === "committed-conflict") {
        const after = await getBookmark(f.session, entity.id);
        await submit(pending);
        assert.deepEqual((await getBookmark(f.session, entity.id)).heads, after.heads);
      } else assert.equal((await commandState(pending)).state, "not-found");
    }
  } finally { f.cleanup(); }
});

test("explicit invalid discovery never selects the default library", async () => {
  const root = mkdtempSync("/private/tmp/me-discovery-test-");
  try {
    const daily = join(root, "daily.json");
    const record = { protocol: 1, executable: "/opt/me/helper", args: ["--stdio"], extensionId: "a".repeat(32) };
    writeFileSync(daily, JSON.stringify(record));
    const explicit = join(root, "explicit.json");
    await assert.rejects(discover(explicit, daily), { code: "HELPER_MISSING" });
    writeFileSync(explicit, "{");
    await assert.rejects(discover(explicit, daily), { code: "INVALID_RECORD" });
    writeFileSync(explicit, JSON.stringify({ ...record, protocol: 2 }));
    await assert.rejects(discover(explicit, daily), { code: "VERSION" });
    writeFileSync(explicit, JSON.stringify(record)); chmodSync(explicit, 0);
    await assert.rejects(discover(explicit, daily), { code: "PERMISSION" }); chmodSync(explicit, 0o600);
    assert.equal((await discover(explicit, daily)).discoveryPath, explicit);
    writeFileSync(explicit, JSON.stringify({ ...record, executable: "/opt/me-mark-everything/helper" }));
    assert.equal((await discover(explicit, daily)).discoveryPath, daily);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
