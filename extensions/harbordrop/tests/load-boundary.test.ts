import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { requireReady } from "../src/lib/contract";
import {
  downloadProgress,
  isDownloading,
} from "../src/lib/download-presentation";
import { MAX_SNAPSHOT_BYTES } from "../src/lib/files";
import { loadSharedState, makeRequest } from "../src/lib/transport";
import { fixtureRoot, jsonFile, randomUUID, snapshot } from "./fixtures";

function largeSnapshot(count: number) {
  const value = snapshot();
  const template = value.tasks[0];
  value.totalTaskCount = count;
  value.tasks = Array.from({ length: count }, (_, index) => ({
    ...template,
    taskID: randomUUID(),
    displayName: `Local-Load-${index.toString().padStart(5, "0")}.bin`,
    state: index < 50 ? "downloading" : "completed",
    completedBytes: index < 50 ? 50 : 100,
    totalBytes: 100,
    progress: index < 50 ? 0.5 : 1,
    speed: index < 50 ? 25 : 0,
  }));
  return value;
}

test("5000 rows survive the private file transport with exact action identity and progress", async () => {
  const root = await fixtureRoot();
  try {
    const value = largeSnapshot(5000);
    assert.ok(Buffer.byteLength(JSON.stringify(value)) < MAX_SNAPSHOT_BYTES);
    await jsonFile(root, "state.json", value);
    const shared = await loadSharedState(root);
    requireReady(shared.descriptor, shared.snapshot);
    assert.equal(shared.snapshot.tasks.length, 5000);
    assert.equal(shared.snapshot.truncated, false);
    assert.equal(shared.snapshot.tasks.filter(isDownloading).length, 50);
    assert.deepEqual(downloadProgress(shared.snapshot.tasks[0]), {
      bytes: "50 B / 100 B",
      percentage: "50%",
      speed: "25 B/s",
    });
    const last = shared.snapshot.tasks[4999];
    assert.equal(last.displayName, "Local-Load-04999.bin");
    assert.equal(
      makeRequest(shared, "revealTask", { task: last }).taskID,
      value.tasks[4999].taskID.toLowerCase(),
    );
  } finally {
    await rm(root, { recursive: true });
  }
});

test("a bounded partial list preserves total count and cannot act on an omitted row", async () => {
  const root = await fixtureRoot();
  try {
    const value = largeSnapshot(5000);
    const omitted = value.tasks[4999];
    value.tasks = value.tasks.slice(0, 2000);
    value.truncated = true;
    await jsonFile(root, "state.json", value);
    const shared = await loadSharedState(root);
    requireReady(shared.descriptor, shared.snapshot);
    assert.equal(shared.snapshot.totalTaskCount, 5000);
    assert.equal(shared.snapshot.tasks.length, 2000);
    assert.equal(shared.snapshot.truncated, true);
    assert.throws(() => makeRequest(shared, "showTask", { task: omitted }), {
      code: "unsupportedAction",
    });
  } finally {
    await rm(root, { recursive: true });
  }
});

test("row and encoded-byte limits remain enforced independently", async () => {
  const root = await fixtureRoot();
  try {
    await jsonFile(root, "state.json", largeSnapshot(5001));
    await assert.rejects(loadSharedState(root), { code: "malformed" });
    const oversized = largeSnapshot(5000);
    oversized.tasks = oversized.tasks.map((row) => ({
      ...row,
      displayName: "🌊".repeat(512),
    }));
    assert.ok(
      Buffer.byteLength(JSON.stringify(oversized)) > MAX_SNAPSHOT_BYTES,
    );
    await jsonFile(root, "state.json", oversized);
    await assert.rejects(loadSharedState(root), { code: "unreadable" });
  } finally {
    await rm(root, { recursive: true });
  }
});
