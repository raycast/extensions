require("./register.cjs");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { promises: fs } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { analyzeCode, CODE_LIMITS } = require("../src/lib/code/analyze.ts");

const digest = (content) => createHash("sha256").update(content).digest("hex");
async function fixture(t, files, limits = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "audit-code-test-"));
  const original = { ...CODE_LIMITS };
  Object.assign(CODE_LIMITS, limits);
  t.after(async () => {
    Object.assign(CODE_LIMITS, original);
    await fs.rm(root, { recursive: true, force: true });
  });
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(root, name), content);
  return root;
}
function trackReads(t, afterStat) {
  const open = fs.open.bind(fs);
  const reads = { bytes: 0, opened: [], closed: 0 };
  t.mock.method(fs, "open", async (...args) => {
    const handle = await open(...args);
    reads.opened.push(path.basename(args[0]));
    const read = handle.read.bind(handle);
    t.mock.method(handle, "read", async (...readArgs) => {
      const result = await read(...readArgs);
      reads.bytes += result.bytesRead;
      return result;
    });
    const readFile = handle.readFile.bind(handle);
    t.mock.method(handle, "readFile", async (...readArgs) => {
      const content = await readFile(...readArgs);
      reads.bytes += content.length;
      return content;
    });
    const createReadStream = handle.createReadStream.bind(handle);
    t.mock.method(handle, "createReadStream", (...readArgs) => {
      const stream = createReadStream(...readArgs);
      stream.on("data", (chunk) => {
        reads.bytes += chunk.length;
      });
      return stream;
    });
    const close = handle.close.bind(handle);
    t.mock.method(handle, "close", async () => {
      await close();
      reads.closed++;
    });
    if (afterStat) {
      const stat = handle.stat.bind(handle);
      let first = true;
      t.mock.method(handle, "stat", async () => {
        const result = await stat();
        if (first) {
          first = false;
          await afterStat(args[0]);
        }
        return result;
      });
    }
    return handle;
  });
  return reads;
}

for (const name of ["script.js", "asset.bin"]) {
  test(`an oversized ${name} is rejected before reading or hashing`, async (t) => {
    const root = await fixture(t, { [name]: "x".repeat(65) }, { bytes: 64 });
    const reads = trackReads(t);
    const result = await analyzeCode(root);
    assert.equal(reads.bytes, 0);
    assert.equal(reads.closed, 1);
    assert.equal(result.complete, false);
    assert.deepEqual(result.fileHashes, {});
    assert.equal(result.files, 0);
    assert.equal(result.bytes, 0);
    assert.match(result.limits[0], /Size limit/);
  });
}

test("each file receives only the remaining extension budget", async (t) => {
  const root = await fixture(t, { "a.js": "x".repeat(40), "b.js": "y".repeat(30), "c.js": "z" }, { bytes: 64 });
  const reads = trackReads(t);
  const result = await analyzeCode(root);
  assert.equal(reads.bytes, 40);
  assert.deepEqual(reads.opened, ["a.js", "b.js"]);
  assert.equal(result.complete, false);
  assert.equal(result.bytes, 40);
  assert.deepEqual(result.fileHashes, { "a.js": digest("x".repeat(40)) });
});

test("files that exactly fill the budget, including empty files, remain complete", async (t) => {
  const root = await fixture(t, { "a.js": "x".repeat(32), "b.bin": "y".repeat(32), "c.js": "" }, { bytes: 64 });
  const reads = trackReads(t);
  const result = await analyzeCode(root);
  assert.equal(reads.bytes, 64);
  assert.equal(result.bytes, 64);
  assert.equal(result.complete, true);
  assert.equal(result.files, 3);
  assert.equal(result.fileHashes["c.js"], digest(""));
});

test("a small script growing during the read cannot exceed the remaining budget", async (t) => {
  const root = await fixture(t, { "a.bin": "x".repeat(24), "b.js": "y".repeat(8) }, { bytes: 64 });
  const reads = trackReads(t, async (file) => {
    if (file.endsWith("b.js")) await fs.appendFile(file, "z".repeat(80));
  });
  const result = await analyzeCode(root);
  assert.equal(reads.bytes, 64);
  assert.equal(reads.closed, 2);
  assert.equal(result.bytes, 64);
  assert.equal(result.complete, false);
  assert.deepEqual(result.fileHashes, { "a.bin": digest("x".repeat(24)) });
});

test("pattern matches and hashes are preserved across read chunks", async (t) => {
  const code = `${" ".repeat(64 * 1024 - 4)}importScripts("https://remote.test/code.js");`;
  const root = await fixture(t, { "script.js": code });
  const result = await analyzeCode(root);
  assert.equal(result.complete, true);
  assert.equal(result.fileHashes["script.js"], digest(code));
  assert.deepEqual(result.hosts, ["remote.test"]);
  assert.deepEqual(result.signals, [{ id: "remote-code", count: 1, files: ["script.js"] }]);
});

test("a script growing past the pattern limit is hashed without retaining its contents", async (t) => {
  const root = await fixture(t, { "script.js": "eval('x');" }, { bytes: 128, match: 16 });
  trackReads(t, (file) => fs.appendFile(file, " ".repeat(32)));
  const result = await analyzeCode(root);
  assert.equal(result.complete, true);
  assert.equal(result.fileHashes["script.js"], digest("eval('x');" + " ".repeat(32)));
  assert.deepEqual(result.signals, []);
  assert.match(result.skipped[0], /Patterns not checked/);
});

test("multi-chunk files above the pattern limit are still fully hashed within budget", async (t) => {
  const content = Buffer.alloc(128 * 1024 + 7, "x");
  const root = await fixture(t, { "script.js": content }, { bytes: content.length, match: 16 });
  const reads = trackReads(t);
  const result = await analyzeCode(root);
  assert.equal(reads.bytes, content.length);
  assert.equal(result.complete, true);
  assert.equal(result.fileHashes["script.js"], digest(content));
  assert.match(result.skipped[0], /Patterns not checked/);
});
