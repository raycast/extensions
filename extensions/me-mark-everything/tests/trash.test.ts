import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { commandState, getBookmark, handshake, queryAll, rpc, type Installation, type Session } from "../src/helper";
import { prepareTrash, preflightEdit } from "../src/helpers/edit";
import { PENDING_KEY, SubmissionController, type Store } from "../src/helpers/submission";
import { toBookmark } from "../src/helpers/me";

const root = mkdtempSync("/private/tmp/me-raycast-trash-test-");
const host = process.env.ME_CORE_HOST ?? "";
if (!host && !process.env.ME_INSTALLED_DISCOVERY) throw Error("Set ME_CORE_HOST or ME_INSTALLED_DISCOVERY for isolated tests.");
const installed = process.env.ME_INSTALLED_DISCOVERY ? JSON.parse(readFileSync(process.env.ME_INSTALLED_DISCOVERY, "utf8")) : undefined;
const installation: Installation = installed
  ? { ...installed, args: ["--stdio", "--config", join(root, "config")], libraryId: undefined }
  : { executable: "/usr/bin/env", args: [process.env.ME_TEST_PYTHON || join(dirname(host), "..", ".venv", "bin", "python"), host, "--stdio", "--config", join(root, "config")], protocol: 1, extensionId: "a".repeat(32) };
let session: Session;
before(async () => {
  await rpc(installation, "create", { path: join(root, "library"), name: "Trash isolated verification" });
  session = await handshake({ installation, discoveryPath: join(root, "record.json") });
});
after(() => rmSync(root, { recursive: true, force: true }));
const write = async (edits: any[]) => rpc(installation, "execute", { id: randomUUID(), libraryId: session.libraryId, edits }, session.libraryId);
async function bookmark() {
  const id = randomUUID();
  await write([{ entity: id, kind: "bookmark", base: {}, values: { title: "删除验证", url: "https://example.test/" + id, note: "保留备注", description: "摘要", favorite: true, position: { parent: null, order: 7 } } }]);
  return getBookmark(session, id);
}
function memoryStore(): Store {
  let raw: string | undefined;
  return { getItem: async () => raw, setItem: async (_, value) => { raw = value; }, removeItem: async () => { raw = undefined; } };
}

test("trash preserves original full heads and only changes life", async () => {
  const entity = await bookmark();
  const pending = prepareTrash(entity, randomUUID(), session);
  assert.deepEqual(pending.command.edits[0].base, entity.heads);
  assert.deepEqual(pending.command.edits[0].values, { life: "trashed" });
  pending.command.edits[0].base!.life.push("not-shared");
  assert.notDeepEqual(pending.command.edits[0].base, entity.heads);
  for (const value of [
    { ...entity, kind: "tag" as const },
    { ...entity, values: { ...entity.values, life: "trashed" } },
    { ...entity, purged: true },
    { ...entity, heads: { ...entity.heads, life: [] } },
  ]) assert.throws(() => prepareTrash(value, randomUUID(), session));
});

test("trash commits normally, leaves active searches, retains fields and can be restored", async () => {
  const entity = await bookmark();
  const pending = prepareTrash(entity, randomUUID(), session);
  await preflightEdit(pending);
  const controller = new SubmissionController(memoryStore());
  assert.equal((await controller.start("edit", async () => pending)).kind, "committed");
  assert.equal(controller.record, undefined);
  const trashed = await getBookmark(session, entity.id);
  assert.deepEqual(trashed.values, { ...entity.values, life: "trashed" });
  assert.equal(trashed.purged, false);
  assert.deepEqual(trashed.conflicts, {});
  assert.equal((await queryAll(session)).items.some((e) => e.id === entity.id), false);
  assert.equal((await queryAll(session, { trash: true })).items.some((e) => e.id === entity.id), true);
  const view = toBookmark({ ...trashed, tags: [], candidateMatch: false }, new Map());
  assert.equal(view.life, "trashed");
  await write([{ entity: entity.id, base: trashed.heads, values: { life: "active" } }]);
  assert.deepEqual((await getBookmark(session, entity.id)).values, entity.values);
});

test("trash receipt survives failed stage persistence and re-entry without a second operation", async () => {
  const entity = await bookmark(), pending = prepareTrash(entity, randomUUID(), session), store = memoryStore();
  const set = store.setItem;
  store.setItem = async (key, value) => {
    if (JSON.parse(value).phase === "committed") throw Error("injected LocalStorage phase failure");
    return set(key, value);
  };
  assert.equal((await new SubmissionController(store).start("edit", async () => pending)).kind, "committed-read-failed");
  const durable = JSON.parse((await store.getItem(PENDING_KEY))!);
  assert.equal(durable.phase, "execute");
  assert.deepEqual(durable.command, pending.command);
  assert.equal((await commandState(pending)).state, "committed-readable");
  const committed = await getBookmark(session, entity.id), ops = readdirSync(join(root, "library", "ops")).sort();
  store.setItem = set;
  const reopened = new SubmissionController(store);
  await reopened.load();
  assert.equal((await reopened.recover(session)).kind, "committed");
  assert.deepEqual((await getBookmark(session, entity.id)).heads, committed.heads);
  assert.deepEqual(readdirSync(join(root, "library", "ops")).sort(), ops);
  assert.equal(await store.getItem(PENDING_KEY), undefined);
});

test("trash races preserve concurrent life candidates and report review", async () => {
  const entity = await bookmark(), pending = prepareTrash(entity, randomUUID(), session);
  await write([{ entity: entity.id, base: entity.heads, values: { note: "Concurrent edit", life: "active" } }]);
  await preflightEdit(pending);
  const outcome = await new SubmissionController(memoryStore()).start("edit", async () => pending);
  assert.equal(outcome.kind, "committed-conflict");
  const after = await getBookmark(session, entity.id);
  assert.equal(after.values.note, "Concurrent edit");
  assert.deepEqual(after.conflicts.life.map((c) => c.value).sort(), ["active", "trashed"]);
});

test("failed initial persistence never trashes the bookmark", async () => {
  const entity = await bookmark(), pending = prepareTrash(entity, randomUUID(), session), store = memoryStore();
  store.setItem = async () => { throw Error("injected initial storage failure"); };
  assert.equal((await new SubmissionController(store).start("edit", async () => pending)).kind, "rejected");
  assert.equal((await commandState(pending)).state, "not-found");
  assert.deepEqual((await getBookmark(session, entity.id)).heads, entity.heads);
});

test("list trash loads the selected UUID before confirmation and deletes that entity", async () => {
  const { requestTrash } = await import("../src/helpers/trash");
  const entity = await bookmark(), other = await bookmark(), store = memoryStore();
  const controller = new SubmissionController(store);
  const steps: string[] = [];
  const outcome = await requestTrash(controller, async () => {
    steps.push("get");
    assert.equal(controller.busy, true);
    return { entity: await getBookmark(session, entity.id), session };
  }, async (loaded) => {
    steps.push("confirm");
    assert.equal(loaded.id, entity.id);
    assert.deepEqual(loaded.heads, entity.heads);
    assert.equal((await getBookmark(session, entity.id)).values.life, "active");
    return true;
  });
  assert.deepEqual(steps, ["get", "confirm"]);
  assert.equal(outcome?.kind, "committed");
  assert.deepEqual((await getBookmark(session, entity.id)).values, { ...entity.values, life: "trashed" });
  assert.deepEqual((await getBookmark(session, other.id)).heads, other.heads);
  assert.equal(await store.getItem(PENDING_KEY), undefined);
});

test("list trash cancellation sends no command and confirmation shares the submission guard", async () => {
  const { requestTrash } = await import("../src/helpers/trash");
  const entity = await bookmark(), store = memoryStore(), controller = new SubmissionController(store);
  const ops = readdirSync(join(root, "library", "ops")).sort();
  let entered!: () => void, answer!: (value: boolean) => void;
  const confirming = new Promise<void>((resolve) => { entered = resolve; });
  const decision = new Promise<boolean>((resolve) => { answer = resolve; });
  const first = requestTrash(controller, async () => ({ entity, session }), async () => {
    entered();
    return decision;
  });
  await confirming;
  assert.equal(controller.busy, true);
  assert.equal((await requestTrash(controller, async () => {
    throw Error("second action must not load or confirm");
  }, async () => { throw Error("must not confirm twice"); }))?.kind, "pending");
  answer(false);
  assert.equal(await first, undefined);
  assert.equal(controller.busy, false);
  assert.equal(await store.getItem(PENDING_KEY), undefined);
  assert.deepEqual(readdirSync(join(root, "library", "ops")).sort(), ops);
  assert.deepEqual((await getBookmark(session, entity.id)).heads, entity.heads);
});
