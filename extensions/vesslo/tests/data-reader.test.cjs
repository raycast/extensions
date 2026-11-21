const assert = require("node:assert/strict");
const test = require("node:test");
const { join } = require("node:path");
const { readFileSync, promises: fs } = require("node:fs");
const { tmpdir } = require("node:os");
const { VessloDataReader } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data-reader.js"),
);
const { MAX_EXPORT_AGE_MS, hasSameDataPresentation } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data-state.js"),
);
const { MAX_EXPORT_BYTES } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const {
  schema3Fixture,
  fixtureClock,
} = require("./helpers/readiness-fixture.cjs");

const DATA = "/fixture/raycast_data.json";
const APP = "/Applications/Example.app";
const now = Date.parse("2026-09-10T00:00:00Z");
const app = (overrides = {}) => ({
  id: "1",
  name: "Example",
  path: APP,
  ...overrides,
});
const content = (apps = [app()], exportedAt = new Date(now).toISOString()) =>
  JSON.stringify({ exportedAt, apps });
const metadata = (overrides = {}) => ({
  dev: 1,
  ino: 1,
  size: 100,
  mtimeMs: 10,
  ctimeMs: 10,
  isFile: () => true,
  isDirectory: () => false,
  ...overrides,
});
const error = (code) => Object.assign(new Error(code), { code });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

function fixture() {
  const state = {
    text: content(),
    meta: metadata(),
    error: null,
    pathErrors: {},
    reads: 0,
    now,
  };
  const fileSystem = {
    async stat(path) {
      if (path === DATA) {
        if (state.error) throw error(state.error);
        return state.meta;
      }
      if (state.pathErrors[path]) throw error(state.pathErrors[path]);
      return metadata({ isFile: () => false, isDirectory: () => true });
    },
    async readFile() {
      state.reads += 1;
      return state.text;
    },
  };
  return {
    state,
    fileSystem,
    reader: new VessloDataReader({
      path: DATA,
      fileSystem,
      now: () => state.now,
    }),
  };
}

test("stat-first polling skips unchanged JSON but still expires it and rechecks app paths", async () => {
  const { reader, state } = fixture();
  assert.equal((await reader.read()).status, "ready");
  state.pathErrors[APP] = "ENOENT";
  const next = await reader.read();
  assert.equal(state.reads, 1);
  assert.equal(next.pathAvailability[APP], "missing");
  state.now += MAX_EXPORT_AGE_MS;
  assert.equal((await reader.read()).status, "stale");
  assert.equal(state.reads, 1);
});

test("schema 3 target evidence expires during unchanged-file polling while global failure remains visible", async () => {
  const { reader, state } = fixture();
  const raw = schema3Fixture();
  raw.checkPhase = "failed";
  raw.checkReason = "sourceFailure";
  delete raw.checkedInventoryRevision;
  state.text = JSON.stringify(raw);
  state.now = fixtureClock;
  const readyTargets = await reader.read();
  assert.equal(readyTargets.status, "ready");
  assert.equal(readyTargets.homebrewReadyTargetCount, 2);
  assert.match(readyTargets.reviewReadinessReason, /failed/);
  state.now += 899_999;
  const unchanged = await reader.read();
  assert.equal(unchanged.homebrewReadyTargetCount, 2);
  assert.equal(hasSameDataPresentation(readyTargets, unchanged), true);
  state.now += 1;
  const expired = await reader.read();
  assert.equal(expired.homebrewReadyTargetCount, 0);
  assert.equal(expired.status, "ready");
  assert.equal(expired.data, readyTargets.data);
  assert.equal(
    expired.reviewReadinessReason,
    readyTargets.reviewReadinessReason,
  );
  assert.equal(state.reads, 1);
  assert.equal(hasSameDataPresentation(readyTargets, expired), false);
});

test("read failures withdraw schema 3 target counts without dropping the last readable inventory", async () => {
  const { reader, state } = fixture();
  state.text = JSON.stringify(schema3Fixture());
  state.now = fixtureClock;
  const ready = await reader.read();
  assert.equal(ready.homebrewReadyTargetCount, 2);
  state.error = "EACCES";
  const denied = await reader.read();
  assert.equal(denied.status, "permissionDenied");
  assert.equal(denied.homebrewReadyTargetCount, 0);
  assert.equal(denied.data, ready.data);
});

test("count mismatches retain the snapshot, fail closed, and recover after a corrected export", async () => {
  const { reader, state } = fixture();
  const current = require("./fixtures/current-app.json");
  state.text = JSON.stringify({
    exportedAt: new Date(now).toISOString(),
    updateCount: 4,
    apps: [current],
  });
  const mismatch = await reader.read();
  assert.equal(mismatch.status, "contractMismatch");
  assert.equal(mismatch.data.apps.length, 1);
  assert.match(mismatch.reason, /reports 4 updates.*contain 1/);
  assert.equal(mismatch.updateCountAssessment.status, "mismatch");
  assert.equal((await reader.read()).status, "contractMismatch");
  assert.equal(state.reads, 1);
  state.meta = metadata({ ino: 2 });
  state.text = JSON.stringify({
    exportedAt: new Date(now).toISOString(),
    updateCount: 1,
    apps: [current],
  });
  const corrected = await reader.read();
  assert.equal(corrected.status, "ready");
  assert.equal(corrected.reason, null);
  assert.equal(corrected.updateCountAssessment.status, "consistent");
});

test("missing legacy count remains explicitly unverifiable without inventing an error or zero", async () => {
  const { reader } = fixture();
  const legacy = await reader.read();
  assert.equal(legacy.status, "ready");
  assert.equal(legacy.data.updateCount, null);
  assert.equal(legacy.updateCountAssessment.status, "unverifiable");
});

test("same export timestamp and mtime still reload on inode, device, size or ctime change", async () => {
  for (const key of ["ino", "dev", "size", "ctimeMs"]) {
    const { reader, state } = fixture();
    await reader.read();
    state.text = content([app({ name: "Changed" })]);
    state.meta = metadata({ [key]: 200 });
    assert.equal((await reader.read()).data.apps[0].name, "Changed", key);
    assert.equal(state.reads, 2);
  }
});

test("action revalidation force reads even with an identical stat signature", async () => {
  const { reader, state } = fixture();
  await reader.read();
  state.text = content([app({ name: "Changed" })]);
  assert.equal(
    (await reader.read({ force: true })).data.apps[0].name,
    "Changed",
  );
  assert.equal(state.reads, 2);
});

test("file errors retain last readable data with explicit nonready status and recover", async () => {
  for (const [code, status] of [
    ["ENOENT", "missing"],
    ["ENOTDIR", "missing"],
    ["EACCES", "permissionDenied"],
    ["EPERM", "permissionDenied"],
    ["EIO", "ioError"],
  ]) {
    const { reader, state } = fixture();
    const ready = await reader.read();
    state.error = code;
    const failed = await reader.read();
    assert.equal(failed.status, status);
    assert.equal(failed.data, ready.data);
    assert.ok(failed.reason);
    state.error = null;
    assert.equal((await reader.read()).status, "ready");
  }
});

test("initial file absence, malformed content and invalid timestamps remain distinguishable", async () => {
  const { reader, state } = fixture();
  state.error = "ENOENT";
  assert.equal((await reader.read()).data, null);
  state.error = null;
  await reader.read();
  state.text = "{";
  assert.equal((await reader.read({ force: true })).status, "malformed");
  assert.equal(reader.getState().data.apps.length, 1);
  for (const exportedAt of [
    undefined,
    "invalid",
    new Date(now + 1).toISOString(),
    new Date(now - MAX_EXPORT_AGE_MS).toISOString(),
  ]) {
    state.text = JSON.stringify({ exportedAt, apps: [app()] });
    assert.equal((await reader.read({ force: true })).status, "stale");
  }
});

test("atomic replacement during read retries and never publishes the replaced contents", async () => {
  const { reader, state, fileSystem } = fixture();
  fileSystem.readFile = async () => {
    state.reads += 1;
    if (state.reads === 1) {
      state.meta = metadata({ ino: 2 });
      return content([app({ name: "Old" })]);
    }
    return content([app({ name: "Replacement" })]);
  };
  const result = await reader.read();
  assert.equal(result.status, "ready");
  assert.equal(result.data.apps[0].name, "Replacement");
  assert.equal(state.reads, 2);
});

test("continuous replacement has bounded retries and an ioError state", async () => {
  const { reader, state, fileSystem } = fixture();
  fileSystem.readFile = async () => {
    state.reads += 1;
    state.meta = metadata({ ino: state.reads + 1 });
    return state.text;
  };
  assert.equal((await reader.read()).status, "ioError");
  assert.equal(state.reads, 3);
});

test("late read cannot overwrite a newer response, including identical file metadata", async () => {
  const { reader, fileSystem } = fixture();
  const started = deferred();
  const delayed = deferred();
  let reads = 0;
  fileSystem.readFile = async () => {
    if (++reads === 1) {
      started.resolve();
      return delayed.promise;
    }
    return content([app({ name: "Newest" })]);
  };
  const first = reader.read();
  await started.promise;
  const latest = await reader.read({ force: true });
  delayed.resolve(content([app({ name: "Old" })]));
  assert.equal((await first).data.apps[0].name, "Newest");
  assert.equal(reader.getState(), latest);
});

test("disposed reader ignores in-flight completion and new reads", async () => {
  const { reader, fileSystem } = fixture();
  const started = deferred();
  const delayed = deferred();
  fileSystem.readFile = async () => {
    started.resolve();
    return delayed.promise;
  };
  const pending = reader.read();
  await started.promise;
  reader.dispose();
  delayed.resolve(content());
  assert.equal((await pending).status, "loading");
  assert.equal(reader.getState().data, null);
  assert.equal((await reader.read()).data, null);
});

test("app path resolution distinguishes missing, denied, invalid and deleted records", async () => {
  const { reader, state, fileSystem } = fixture();
  const seenPaths = [];
  const stat = fileSystem.stat;
  fileSystem.stat = async (path) => {
    seenPaths.push(path);
    return stat(path);
  };
  state.text = content([
    app(),
    app({ id: "2", path: "/Applications/Denied.app" }),
    app({ id: "3", path: "relative.app" }),
    app({ id: "4", path: "/Applications/Deleted.app", isDeleted: true }),
    app({ id: "5", path: "/tmp/file.txt" }),
  ]);
  state.pathErrors[APP] = "ENOENT";
  state.pathErrors["/Applications/Denied.app"] = "EACCES";
  const result = await reader.read();
  assert.equal(result.pathAvailability[APP], "missing");
  assert.equal(
    result.pathAvailability["/Applications/Denied.app"],
    "permissionDenied",
  );
  assert.equal(result.pathAvailability["relative.app"], "unknown");
  assert.equal(result.pathAvailability["/tmp/file.txt"], "unknown");
  assert.equal(result.data.apps.length, 5);
  assert.equal(seenPaths.includes("/Applications/Deleted.app"), false);
  assert.equal(seenPaths.includes("relative.app"), false);
});

test("failed forced read invalidates cache until an actual read succeeds", async () => {
  for (const mode of ["denied", "malformed"]) {
    const { reader, fileSystem } = fixture();
    await reader.read();
    const originalRead = fileSystem.readFile;
    fileSystem.readFile = async () => {
      if (mode === "denied") throw error("EACCES");
      return "{";
    };
    const expected = mode === "denied" ? "permissionDenied" : "malformed";
    assert.equal((await reader.read({ force: true })).status, expected);
    assert.equal((await reader.read()).status, expected);
    fileSystem.readFile = originalRead;
    assert.equal((await reader.read()).status, "ready");
  }
});

test("replacement during app path stat retries before publishing ready state", async () => {
  const { reader, fileSystem, state } = fixture();
  const stat = fileSystem.stat;
  let replaced = false;
  fileSystem.stat = async (path) => {
    if (path === APP && !replaced) {
      replaced = true;
      state.meta = metadata({ ino: 2 });
      state.text = content([app({ name: "After Path Check" })]);
    }
    return stat(path);
  };
  assert.equal((await reader.read()).data.apps[0].name, "After Path Check");
  assert.equal(state.reads, 2);
});

test("unchanged polling is presentation-stable while expiry, path state and data changes publish", async () => {
  const { reader, state } = fixture();
  const ready = await reader.read();
  state.now += 3000;
  const unchanged = await reader.read();
  assert.equal(unchanged.checkedAt, state.now);
  assert.notEqual(unchanged.checkedAt, ready.checkedAt);
  assert.equal(hasSameDataPresentation(ready, unchanged), true);
  assert.equal(state.reads, 1);

  state.pathErrors[APP] = "EACCES";
  const deniedPath = await reader.read();
  assert.equal(hasSameDataPresentation(unchanged, deniedPath), false);
  assert.equal(hasSameDataPresentation(deniedPath, await reader.read()), true);

  state.now += MAX_EXPORT_AGE_MS;
  const expired = await reader.read();
  assert.equal(expired.status, "stale");
  assert.equal(hasSameDataPresentation(deniedPath, expired), false);
  assert.equal(hasSameDataPresentation(expired, await reader.read()), true);

  state.meta = metadata({ ino: 2 });
  state.text = content([app({ name: "New export" })]);
  const changed = await reader.read();
  assert.equal(changed.data.apps[0].name, "New export");
  assert.equal(hasSameDataPresentation(expired, changed), false);
});

test("paired app fixtures observe export revision changes with identical exportedAt and mtime", async () => {
  const { reader, state } = fixture();
  const directory = join(__dirname, "fixtures/app-integration");
  const first = readFileSync(
    join(directory, "same-mtime-different-revision-a.json"),
    "utf8",
  );
  const second = readFileSync(
    join(directory, "same-mtime-different-revision-b.json"),
    "utf8",
  );
  state.now = Date.parse("2026-09-10T12:00:00Z");
  state.text = first;
  const old = await reader.read();
  state.text = second;
  state.meta = metadata({ ino: 2 });
  const newer = await reader.read();
  assert.equal(newer.status, "ready");
  assert.equal(newer.data.exportedAt, old.data.exportedAt);
  assert.equal(newer.data.lastUpdateCheckAt, old.data.lastUpdateCheckAt);
  assert.equal(old.data.exportRevision, 100);
  assert.equal(newer.data.exportRevision, 101);
  assert.equal(hasSameDataPresentation(old, newer), false);
  state.text = first;
  const forced = await reader.read({ force: true });
  assert.equal(forced.data.exportRevision, 100);
  assert.equal(state.reads, 3);
});

test("check phase is distinct from IO readiness, and cached check expiry changes presentation", async () => {
  const { reader, state } = fixture();
  const directory = join(__dirname, "fixtures/app-integration");
  state.now = Date.parse("2026-09-10T12:00:00Z");
  for (const name of [
    "checking.json",
    "failed.json",
    "unverified-startup.json",
  ]) {
    state.text = readFileSync(join(directory, name), "utf8");
    const snapshot = await reader.read({ force: true });
    assert.equal(snapshot.status, "ready", name);
    assert.ok(snapshot.reviewReadinessReason, name);
  }
  const raw = JSON.parse(readFileSync(join(directory, "ready.json"), "utf8"));
  raw.lastUpdateCheckAt = new Date(
    state.now - MAX_EXPORT_AGE_MS + 1000,
  ).toISOString();
  state.text = JSON.stringify(raw);
  const ready = await reader.read({ force: true });
  assert.equal(ready.reviewReadinessReason, null);
  const reads = state.reads;
  state.now += 1000;
  const expiredCheck = await reader.read();
  assert.equal(expiredCheck.status, "ready");
  assert.equal(expiredCheck.data, ready.data);
  assert.equal(state.reads, reads);
  assert.match(expiredCheck.reviewReadinessReason, /last completed.*24 hours/);
  assert.equal(hasSameDataPresentation(ready, expiredCheck), false);
});

test("schema 2 malformed and permission failures retain readable data but withdraw current authority", async () => {
  const { reader, state } = fixture();
  state.now = Date.parse("2026-09-10T12:00:00Z");
  state.text = readFileSync(
    join(__dirname, "fixtures/app-integration/ready.json"),
    "utf8",
  );
  const ready = await reader.read();
  assert.equal(ready.status, "ready");
  state.error = "EACCES";
  const denied = await reader.read({ force: true });
  assert.equal(denied.status, "permissionDenied");
  assert.equal(denied.data, ready.data);
  state.error = null;
  state.text = readFileSync(
    join(__dirname, "fixtures/app-integration/malformed-truncated.input"),
    "utf8",
  );
  const malformed = await reader.read({ force: true });
  assert.equal(malformed.status, "malformed");
  assert.equal(malformed.data, ready.data);
});

test("oversized export metadata fails before reading or parsing the file", async () => {
  for (const size of [MAX_EXPORT_BYTES + 1, -1, Number.NaN]) {
    const { reader, state } = fixture();
    state.meta = metadata({ size });
    assert.equal((await reader.read()).status, "malformed");
    assert.equal(state.reads, 0);
  }
});

test("default disk reader rejects symlinks, oversized regular files and invalid UTF-8 without modifying them", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "vesslo-export-reader-"));
  try {
    const target = join(directory, "export.json");
    const symlink = join(directory, "link.json");
    await fs.writeFile(target, content());
    await fs.symlink(target, symlink);
    const options = { now: () => now };
    assert.equal(
      (await new VessloDataReader({ ...options, path: symlink }).read()).status,
      "malformed",
    );
    assert.equal((await fs.lstat(symlink)).isSymbolicLink(), true);
    await fs.truncate(target, MAX_EXPORT_BYTES + 1);
    assert.equal(
      (await new VessloDataReader({ ...options, path: target }).read()).status,
      "malformed",
    );
    assert.equal((await fs.stat(target)).size, MAX_EXPORT_BYTES + 1);
    await fs.writeFile(target, Buffer.from([0xff, 0xfe]));
    const invalid = await new VessloDataReader({
      ...options,
      path: target,
    }).read();
    assert.equal(invalid.status, "malformed");
    assert.match(invalid.reason, /UTF-8/);
    assert.deepEqual(await fs.readFile(target), Buffer.from([0xff, 0xfe]));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
