const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { load } = require("./helpers.cjs");
const { applyRetention, startJobLease } = load("utils/retention.ts");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fluidvoice-retention-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("dead-process and expired leases are removed while fresh live leases are preserved", async (t) => {
  const root = await fixture(t);
  for (const [name, lease] of [
    ["media-dead", { pid: 2147483647, heartbeatAt: Date.now() }],
    ["media-expired", { pid: process.pid, heartbeatAt: Date.now() - 48 * 60 * 60 * 1000 }],
    ["media-live", { pid: process.pid, heartbeatAt: Date.now() }],
  ]) {
    const directory = path.join(root, name);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, "active.json"), JSON.stringify(lease));
    await fs.writeFile(path.join(directory, "download.mp3"), "media bytes");
  }
  await applyRetention(root, 0);
  assert.deepEqual(await fs.readdir(root), ["media-live"]);
  assert.equal(await fs.readFile(path.join(root, "media-live/download.mp3"), "utf8"), "media bytes");
});

test("old unmarked interrupted jobs are recovered but recent unmarked folders are protected", async (t) => {
  const root = await fixture(t);
  for (const name of ["media-old", "media-new", "unrelated"]) {
    const directory = path.join(root, name);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, "download.mp3"), "media bytes");
  }
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await fs.utimes(path.join(root, "media-old"), old, old);
  await fs.utimes(path.join(root, "unrelated"), old, old);
  await applyRetention(root, 0);
  assert.deepEqual((await fs.readdir(root)).sort(), ["media-new", "unrelated"]);
});

test("permission-denied process probes do not remove a fresh live job", async (t) => {
  const root = await fixture(t);
  const directory = path.join(root, "media-live");
  await fs.mkdir(directory);
  await fs.writeFile(
    path.join(directory, "active.json"),
    JSON.stringify({ pid: process.pid, heartbeatAt: Date.now() }),
  );
  const original = process.kill;
  process.kill = () => {
    throw Object.assign(new Error("Not permitted"), { code: "EPERM" });
  };
  try {
    await applyRetention(root, 0);
  } finally {
    process.kill = original;
  }
  assert.deepEqual(await fs.readdir(root), ["media-live"]);
});

test("job lease creates a valid marker and its stop function is idempotent", async (t) => {
  const root = await fixture(t);
  const stop = await startJobLease(root);
  t.after(stop);
  const lease = JSON.parse(await fs.readFile(path.join(root, "active.json"), "utf8"));
  assert.equal(lease.pid, process.pid);
  assert.ok(Math.abs(Date.now() - lease.heartbeatAt) < 5000);
  assert.deepEqual(await fs.readdir(root), ["active.json"]);
  await stop();
  await stop();
});

test("canonical input protection works when the media root is itself a symlink", async (t) => {
  const root = await fixture(t);
  const directory = path.join(root, "media-selected");
  await fs.mkdir(directory);
  const input = path.join(directory, "download.mp3");
  await fs.writeFile(input, "recording");
  await fs.writeFile(path.join(directory, "completed.json"), JSON.stringify({ completedAt: 1 }));
  const alias = path.join(root, "root-alias");
  await fs.symlink(root, alias);
  await applyRetention(alias, 0, await fs.realpath(input));
  assert.equal(await fs.readFile(input, "utf8"), "recording");
});
