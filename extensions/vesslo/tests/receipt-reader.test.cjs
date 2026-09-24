const assert = require("node:assert/strict");
const test = require("node:test");
const {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  linkSync,
  rmSync,
} = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");
const { HandoffReceiptReader } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/receipt-reader.js"),
);
const { bindReceipt, MAX_RECEIPT_BYTES } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/receipt-contract.js"),
);
const fixtures = join(__dirname, "fixtures/app-integration");
const fixtureText = (name) => readFileSync(join(fixtures, name), "utf8");
const now = Date.parse("2026-09-10T12:00:30Z");
const DATA = "/fixtures/raycast_receipts.json";
const metadata = (override = {}) => ({
  dev: 1,
  ino: 1,
  size: 100,
  mtimeMs: 10,
  ctimeMs: 10,
  nlink: 1,
  mode: 0o600,
  uid: 501,
  isFile: () => true,
  isDirectory: () => false,
  isSymbolicLink: () => false,
  ...override,
});
const error = (code) => Object.assign(new Error(code), { code });
function fixture(name = "receipt-accepted.json") {
  const state = {
    text: fixtureText(name),
    meta: metadata(),
    parent: metadata({
      mode: 0o755,
      isFile: () => false,
      isDirectory: () => true,
    }),
    now,
    error: null,
    reads: 0,
    opens: 0,
    closes: 0,
  };
  const fileSystem = {
    uid: 501,
    async lstat(path) {
      if (state.error) throw error(state.error);
      return path === DATA ? state.meta : state.parent;
    },
    async open() {
      state.opens++;
      const text = state.text;
      const meta = { ...state.meta };
      return {
        async stat() {
          return meta;
        },
        async read(buffer, offset, length, position) {
          state.reads++;
          const bytes = Buffer.from(text);
          const bytesRead = Math.min(
            length,
            Math.max(0, bytes.length - position),
          );
          bytes.copy(buffer, offset, position, position + bytesRead);
          return { bytesRead };
        },
        async close() {
          state.closes++;
        },
      };
    },
  };
  return {
    state,
    fileSystem,
    reader: new HandoffReceiptReader({
      path: DATA,
      fileSystem,
      now: () => state.now,
    }),
  };
}

test("bounded stat-first reader caches unchanged file, force reloads and expires terminal without rereading", async () => {
  const { reader, state } = fixture("receipt-completed.json");
  assert.equal((await reader.read()).status, "ready");
  await reader.read();
  assert.equal(state.opens, 1);
  await reader.read({ force: true });
  assert.equal(state.opens, 2);
  state.now += 86400000;
  const expired = await reader.read();
  assert.equal(expired.receipts.length, 0);
  assert.equal(expired.expiredReceipts.length, 1);
  assert.equal(state.opens, 2);
  assert.equal(
    bindReceipt(expired, expired.expiredReceipts[0].request).status,
    "expired",
  );
});

test("real published sequence and standalone alternatives never overwrite immutable observations", async () => {
  const manifest = JSON.parse(fixtureText("manifest.json"));
  const { reader, state } = fixture();
  for (const file of manifest.normalReceiptSequence) {
    state.text = fixtureText(file);
    state.meta = metadata({ ino: state.meta.ino + 1 });
    assert.equal((await reader.read()).status, "ready", file);
  }
  state.text = fixtureText("receipt-partial-failure.json");
  assert.equal((await reader.read({ force: true })).status, "conflict");
  assert.equal(
    reader.getState().receipts[0].phase,
    "completed",
    "Prior data may be retained only with a nonready status",
  );
  assert.equal(
    bindReceipt(reader.getState(), reader.getState().receipts[0].request)
      .receipt,
    null,
  );
  for (const file of [
    "receipt-partial-failure.json",
    "receipt-partial-rejection.json",
    "receipt-cancelled.json",
    "receipt-restarted.json",
  ]) {
    assert.equal((await fixture(file).reader.read()).status, "ready", file);
  }
});

test("missing, permission and malformed reads retain explicit unconfirmed history and recover", async () => {
  for (const [code, expected] of [
    ["ENOENT", "missing"],
    ["EACCES", "permissionDenied"],
    ["EPERM", "permissionDenied"],
    ["EIO", "ioError"],
  ]) {
    const { reader, state } = fixture("receipt-completed.json");
    const ready = await reader.read();
    state.error = code;
    const failed = await reader.read();
    assert.equal(failed.status, expected);
    assert.equal(failed.receipts, ready.receipts);
    assert.ok(failed.reason);
    assert.equal(bindReceipt(failed, ready.receipts[0].request).receipt, null);
    state.error = null;
    assert.equal((await reader.read()).status, "ready");
  }
  const { reader, state } = fixture();
  await reader.read();
  state.text = "{";
  assert.equal((await reader.read({ force: true })).status, "malformed");
  assert.equal(
    (await reader.read()).status,
    "malformed",
    "A failed forced read must invalidate the cache",
  );
  state.text = fixtureText("receipt-accepted.json");
  assert.equal((await reader.read()).status, "ready");
});

test("same request ID cannot change identity, go backwards or change at equal revision", async () => {
  for (const mutate of [
    (r) => {
      r.revision = 1;
    },
    (r) => {
      r.reason = "new reason";
    },
    (r) => {
      r.request.targets[0].canonicalPath = "/Applications/Other.app";
      r.targets[0].target.canonicalPath = "/Applications/Other.app";
    },
  ]) {
    const { reader, state } = fixture("receipt-running.json");
    await reader.read();
    const value = JSON.parse(state.text);
    mutate(value.receipts[0]);
    state.text = JSON.stringify(value);
    assert.equal((await reader.read({ force: true })).status, "conflict");
  }
});

test("unsafe files and unsafe parent directories are rejected before any bytes are read", async () => {
  for (const override of [
    { nlink: 2 },
    { uid: 0 },
    { mode: 0o644 },
    { isFile: () => false },
    { isSymbolicLink: () => true },
  ]) {
    const { reader, state } = fixture();
    Object.assign(state.meta, override);
    assert.equal((await reader.read()).status, "unsafeFile");
    assert.equal(state.opens, 0);
  }
  for (const override of [
    { uid: 502 },
    { mode: 0o777 },
    { isDirectory: () => false },
    { isSymbolicLink: () => true },
  ]) {
    const { reader, state } = fixture();
    Object.assign(state.parent, override);
    assert.equal((await reader.read()).status, "unsafeFile");
    assert.equal(state.opens, 0);
  }
  const { reader, state } = fixture();
  state.meta.size = MAX_RECEIPT_BYTES + 1;
  assert.equal((await reader.read()).status, "malformed");
  assert.equal(state.opens, 0);
});

test("descriptor identity and atomic replacement trigger bounded retries and always close handles", async () => {
  const { reader, state, fileSystem } = fixture();
  const original = fileSystem.open;
  let replace = true;
  fileSystem.open = async (...args) => {
    const handle = await original(...args);
    if (replace) {
      replace = false;
      state.meta = metadata({ ino: 2 });
      state.text = fixtureText("receipt-running.json");
    }
    return handle;
  };
  assert.equal((await reader.read()).receipts[0].phase, "running");
  assert.equal(state.opens, 2);
  assert.equal(state.closes, 2);
  fileSystem.open = async (...args) => {
    const handle = await original(...args);
    state.meta = metadata({ ino: state.meta.ino + 1 });
    return handle;
  };
  assert.equal((await reader.read({ force: true })).status, "ioError");
  assert.equal(state.opens, 5);
  assert.equal(state.closes, 5);
});

test("disposed readers ignore late completions and perform no new reads", async () => {
  const { reader, state, fileSystem } = fixture();
  const original = fileSystem.open;
  let release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  fileSystem.open = async (...args) => {
    await hold;
    return original(...args);
  };
  const pending = reader.read();
  await new Promise(setImmediate);
  reader.dispose();
  release();
  assert.equal((await pending).status, "loading");
  const opens = state.opens;
  await reader.read();
  assert.equal(state.opens, opens);
});

test("native reader handles a private isolated regular file and refuses links without following them", async (t) => {
  const { realpathSync } = require("node:fs");
  const root = realpathSync(
    mkdtempSync(join(homedir(), ".vesslo-receipt-reader-test-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = join(root, "raycast_receipts.json");
  writeFileSync(target, fixtureText("receipt-accepted.json"), { mode: 0o600 });
  // The isolated fixture has private, owned parents; production paths are untouched.
  const native = new HandoffReceiptReader({ path: target, now: () => now });
  assert.equal((await native.read()).status, "ready");
  const symlink = join(root, "symlink.json");
  symlinkSync(target, symlink);
  assert.equal(
    (await new HandoffReceiptReader({ path: symlink }).read()).status,
    "unsafeFile",
  );
  const hardlink = join(root, "hardlink.json");
  linkSync(target, hardlink);
  assert.equal(
    (await new HandoffReceiptReader({ path: hardlink }).read()).status,
    "unsafeFile",
  );
});
