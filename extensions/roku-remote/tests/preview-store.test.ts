import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createFilePreviewClaims,
  createPreviewStore,
  PREVIEW_TTL_MS,
  type PreviewStorage,
} from "../src/lib/preview-store";
import type { PreparedInstruction } from "../src/lib/automation";

const IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];

function prepared(appId = "12", deviceId = "living-room"): PreparedInstruction {
  return {
    plan: {
      text: "open gaming on Living Room",
      steps: [
        { kind: "launch", deviceId, deviceName: "Living Room", explicitTarget: true, appId, appName: `App ${appId}` },
      ],
      preview: [`Living Room: open App ${appId}`],
    },
    routines: [],
  };
}

function memory() {
  const records = new Map<string, unknown>();
  const claims = new Set<string>();
  const storage: PreviewStorage = {
    allItems: async () => Object.fromEntries(records),
    getItem: async (key) => records.get(key),
    setItem: async (key, value) => {
      records.set(key, value);
    },
    removeItem: async (key) => {
      records.delete(key);
    },
    async claim(id, purpose) {
      const key = `${id}.${purpose}`;
      if (claims.has(key)) return false;
      claims.add(key);
      return true;
    },
    claimed: async (id, purpose) => claims.has(`${id}.${purpose}`),
  };
  return { records, claims, storage };
}

test("overlapping previews with identical text keep separate immutable plans", async () => {
  const { storage } = memory();
  const store = createPreviewStore(storage);
  const oldPlan = prepared("12");
  const pending = store.savePreview(oldPlan, "living-room");
  oldPlan.plan.preview[0] = "Changed caller data";
  const first = await pending;
  const second = await store.savePreview(prepared("13"), "living-room");
  assert.notEqual(first.previewId, second.previewId);
  assert.deepEqual((await store.getPreview(first.previewId)).prepared, prepared("12"));
  assert.deepEqual((await store.getPreview(second.previewId)).prepared, prepared("13"));
  first.prepared.plan.preview[0] = "Changed returned data";
  const read = await store.getPreview(first.previewId);
  read.prepared.plan.preview[0] = "Changed read data";
  assert.deepEqual((await store.consumePreview(first.previewId)).prepared, prepared("12"));
  assert.deepEqual((await store.consumePreview(second.previewId)).prepared, prepared("13"));
});

test("a consumed ID cannot be replayed or reused for a new plan", async () => {
  const { storage } = memory();
  const ids = [IDS[0], IDS[0], IDS[1]];
  const store = createPreviewStore(storage, { newId: () => ids.shift()! });
  const first = await store.savePreview(prepared(), "living-room");
  await store.consumePreview(first.previewId);
  await assert.rejects(store.getPreview(first.previewId), /already used/);
  await assert.rejects(store.consumePreview(first.previewId), /already used/);
  const second = await store.savePreview(prepared("13"), "living-room");
  assert.equal(second.previewId, IDS[1]);
});

test("only one concurrent store instance can consume a preview", async () => {
  const { storage } = memory();
  const firstStore = createPreviewStore(storage);
  const secondStore = createPreviewStore(storage);
  const entry = await firstStore.savePreview(prepared(), "living-room");
  const outcomes = await Promise.allSettled([
    firstStore.consumePreview(entry.previewId),
    secondStore.consumePreview(entry.previewId),
  ]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((result) => result.status === "rejected").length, 1);
});

test("expiry at exactly ten minutes stops execution and removes plan content", async () => {
  const { storage, records } = memory();
  let clock = 1_000;
  const store = createPreviewStore(storage, { now: () => clock });
  const entry = await store.savePreview(prepared(), "living-room");
  clock += PREVIEW_TTL_MS - 1;
  assert.equal((await store.getPreview(entry.previewId)).previewId, entry.previewId);
  clock += 1;
  await assert.rejects(store.consumePreview(entry.previewId), /expired/);
  assert.equal(records.size, 0);
});

test("new previews prune abandoned expired content without removing unrelated app data", async () => {
  const { storage, records } = memory();
  let clock = 1_000;
  const store = createPreviewStore(storage, { now: () => clock });
  const old = await store.savePreview(prepared(), "living-room");
  records.set("roku-direct.device.example", "keep");
  clock += PREVIEW_TTL_MS;
  const fresh = await store.savePreview(prepared("13"), "living-room");
  await assert.rejects(store.getPreview(old.previewId), /missing or expired/);
  assert.equal((await store.getPreview(fresh.previewId)).previewId, fresh.previewId);
  assert.equal(records.get("roku-direct.device.example"), "keep");
  assert.equal(records.size, 2);
});

test("corrupt, mismatched and future-dated records cannot be confirmed or consumed", async () => {
  for (const corrupt of [
    () => "not json",
    () => JSON.stringify(null),
    (raw: string) => JSON.stringify({ ...JSON.parse(raw), previewId: IDS[2] }),
    (raw: string) => JSON.stringify({ ...JSON.parse(raw), deviceId: "other-tv" }),
    (raw: string) => JSON.stringify({ ...JSON.parse(raw), prepared: { plan: { text: "home" }, routines: [] } }),
    (raw: string) => JSON.stringify({ ...JSON.parse(raw), createdAt: 20_000, expiresAt: 20_000 + PREVIEW_TTL_MS }),
  ]) {
    const { storage, records } = memory();
    const store = createPreviewStore(storage, { now: () => 1_000 });
    const entry = await store.savePreview(prepared(), "living-room");
    const [key, raw] = [...records.entries()][0];
    records.set(key, corrupt(raw as string));
    await assert.rejects(store.getPreview(entry.previewId), /invalid|expired/);
    await assert.rejects(store.consumePreview(entry.previewId), /invalid|expired/);
  }
});

test("preview creation rejects multiple or mismatched target TVs before storage writes", async () => {
  const { storage, records, claims } = memory();
  const store = createPreviewStore(storage);
  await assert.rejects(store.savePreview(prepared(), "other-tv"), /invalid/);
  const multi = prepared();
  multi.plan.steps.push(prepared("13", "other-tv").plan.steps[0]);
  multi.plan.preview.push("Other TV: open App 13");
  await assert.rejects(store.savePreview(multi, "living-room"), /invalid/);
  assert.equal(records.size, 0);
  assert.equal(claims.size, 0);
});

test("storage failure after claiming an execution never makes the token reusable", async () => {
  const { storage } = memory();
  const store = createPreviewStore(storage);
  const entry = await store.savePreview(prepared(), "living-room");
  storage.removeItem = async () => {
    throw new Error("Storage unavailable");
  };
  await assert.rejects(store.consumePreview(entry.previewId), /Storage unavailable/);
  await assert.rejects(store.consumePreview(entry.previewId), /already used/);
});

test("disk claims arbitrate independent clients and reject traversal IDs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "roku-preview-test-"));
  try {
    const first = createFilePreviewClaims(directory);
    const second = createFilePreviewClaims(directory);
    const outcomes = await Promise.all([first.claim(IDS[0], "consumed"), second.claim(IDS[0], "consumed")]);
    assert.deepEqual(outcomes.sort(), [false, true]);
    assert.equal(await second.claimed(IDS[0], "consumed"), true);
    await assert.rejects(first.claim("../../escape", "created"), /invalid/);
    assert.deepEqual(await readdir(directory), [`${IDS[0]}.consumed`]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
