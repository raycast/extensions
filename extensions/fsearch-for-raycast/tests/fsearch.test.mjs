import assert from "node:assert/strict";
import { test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  findBinary,
  getStatus,
  isContentSearch,
  parseResponse,
  parseStatus,
  resolveBinary,
  SearchError,
  searchFiles,
  setSocketPath,
} from "../src/fsearch.ts";
import { appleScriptString } from "../src/applescript.ts";
import { installCommand } from "../src/install.ts";

// Never touch a real daemon: every request goes through the mock executables.
setSocketPath(null);

test("preserves ranked file results, including spaces and Unicode", () => {
  const result = parseResponse(
    JSON.stringify({
      ok: true,
      took_us: 1234,
      hits: [
        { path: "/Users/me/日本語 report.pdf", kind: "file", size: 42 },
        { path: "/tmp/folder", kind: "dir", size: 0 },
      ],
    }),
  );
  assert.equal(result.files[0].path, "/Users/me/日本語 report.pdf");
  assert.equal(result.files[1].kind, "dir");
  assert.equal(result.tookUs, 1234);
  assert.equal(result.complete, true);
});

test("content matches retain line numbers and partial/indexing flags", () => {
  const result = parseResponse(
    JSON.stringify({
      ok: true,
      took_us: 40,
      complete: false,
      indexing: 12,
      files: [
        {
          path: "/tmp/code.ts",
          matches: [{ line: 7, text: "const hello = 1;" }],
        },
      ],
    }),
  );
  assert.deepEqual(result.files[0].matches, [
    { line: 7, text: "const hello = 1;" },
  ]);
  assert.equal(result.complete, false);
  assert.equal(result.indexing, true);
});

function kindOf(fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(
      error instanceof SearchError,
      `expected SearchError, got ${error}`,
    );
    return error.kind;
  }
  assert.fail("expected an error");
}

test("classifies daemon errors so the UI can recover", () => {
  assert.equal(
    kindOf(() =>
      parseResponse(
        '{"ok":false,"error":"indexing (first run scans the whole disk, ~20s)"}',
      ),
    ),
    "indexing",
  );
  assert.equal(
    kindOf(() =>
      parseResponse('{"ok":false,"error":"cannot reach daemon: refused"}'),
    ),
    "daemon",
  );
  assert.equal(
    kindOf(() => parseResponse('{"ok":false,"error":"unknown type bogus"}')),
    "query",
  );
  assert.throws(
    () => parseResponse('{"ok":false,"error":"unknown type bogus"}'),
    /unknown type bogus/,
  );
  assert.equal(
    kindOf(() => parseResponse('{"ok":false}')),
    "query",
  );
});

test("rejects malformed responses as protocol errors", () => {
  assert.equal(
    kindOf(() => parseResponse("not json")),
    "protocol",
  );
  assert.equal(
    kindOf(() =>
      parseResponse(
        '{"ok":true,"took_us":1,"hits":[{"path":"relative","kind":"file","size":1}]}',
      ),
    ),
    "protocol",
  );
  assert.throws(
    () =>
      parseResponse(
        '{"ok":true,"took_us":1,"files":[{"path":"/a","matches":[{"line":"7","text":"x"}]}]}',
      ),
    /invalid content match/,
  );
  assert.throws(() => parseResponse('{"ok":true,"took_us":1}'), /no result/);
  assert.throws(() => parseResponse('{"ok":true}'), /timing/);
});

test("stdio transports reserved commands and shell characters as query data", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-test-"));
  const binary = join(dir, "mock fsearch");
  try {
    await writeFile(
      binary,
      `#!${process.execPath}\nlet input = ''; process.stdin.on('data', c => input += c); process.stdin.on('end', () => { const request = JSON.parse(input); process.stdout.write(JSON.stringify({ok: true, took_us: 1, hits: [{path: '/tmp/' + JSON.stringify({args: process.argv.slice(2), request}), kind: 'file', size: 1}]})); });\n`,
      { mode: 0o755 },
    );
    const query = "install $(touch /tmp/should-never-exist) 'quoted'";
    const result = await searchFiles(
      binary,
      query,
      "/Users/me/My Files",
      25,
      new AbortController().signal,
    );
    const received = JSON.parse(result.files[0].path.slice(5));
    assert.deepEqual(received, {
      args: ["stdio"],
      request: { q: query, limit: 25, in: "/Users/me/My Files" },
    });
    await writeFile(
      binary,
      `#!${process.execPath}\nsetTimeout(() => {}, 20000);\n`,
      { mode: 0o755 },
    );
    const controller = new AbortController();
    const pending = searchFiles(
      binary,
      "test",
      undefined,
      50,
      controller.signal,
    );
    controller.abort();
    await assert.rejects(pending, /abort/i);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("a crashing executable is reported as a daemon error with its stderr", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fsearch-test-"));
  const binary = join(dir, "fsearch");
  try {
    await writeFile(
      binary,
      `#!${process.execPath}\nprocess.stderr.write('cannot open index');process.exit(2);\n`,
      { mode: 0o755 },
    );
    await assert.rejects(
      searchFiles(binary, "x", undefined, 1, new AbortController().signal),
      (error) =>
        error instanceof SearchError &&
        error.kind === "daemon" &&
        /cannot open index/.test(error.message),
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("missing executable produces an actionable error", async () => {
  await assert.rejects(
    searchFiles(
      "/nonexistent/fsearch",
      "hello",
      undefined,
      50,
      new AbortController().signal,
    ),
    (error) =>
      error instanceof SearchError &&
      error.kind === "missing" &&
      /Could not run FSearch at/.test(error.message),
  );
  await assert.rejects(
    searchFiles(
      "relative/fsearch",
      "hello",
      undefined,
      50,
      new AbortController().signal,
    ),
    /absolute/,
  );
});

test("resolves the executable path from preferences", () => {
  assert.equal(
    resolveBinary("~/.local/bin/fsearch"),
    join(homedir(), ".local/bin/fsearch"),
  );
  assert.equal(resolveBinary("  /opt/fsearch  "), "/opt/fsearch");
});

test("parses daemon status including Full Disk Access", async () => {
  const status = parseStatus(
    '{"content_docs":55376,"content_pending":0,"dirs":806916,"entries":4933332,"full_disk_access":false,"ok":true}',
  );
  assert.deepEqual(status, {
    fullDiskAccess: false,
    entries: 4933332,
    contentDocs: 55376,
    contentPending: 0,
  });
  assert.equal(
    parseStatus('{"ok":true,"full_disk_access":true}').fullDiskAccess,
    true,
  );
  assert.throws(() => parseStatus('{"ok":false}'), SearchError);

  const dir = await mkdtemp(join(tmpdir(), "fsearch-test-"));
  const binary = join(dir, "fsearch");
  try {
    await writeFile(
      binary,
      `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({ok: true, entries: 7, full_disk_access: true, args: process.argv.slice(2)}));\n`,
      { mode: 0o755 },
    );
    const status = await getStatus(binary, new AbortController().signal);
    assert.equal(status.entries, 7);
    assert.equal(status.fullDiskAccess, true);
  } finally {
    await rm(dir, { recursive: true });
  }
});

test("preserves modification times for recent-file sorting and rejects invalid dates", () => {
  const result = parseResponse(
    JSON.stringify({
      ok: true,
      took_us: 1,
      hits: [
        {
          path: "/tmp/recent.txt",
          kind: "file",
          size: 1024,
          mtime: 1791503182,
        },
      ],
    }),
  );
  assert.equal(result.files[0].mtime, 1791503182);
  assert.throws(
    () =>
      parseResponse(
        JSON.stringify({
          ok: true,
          took_us: 1,
          hits: [
            {
              path: "/tmp/recent.txt",
              kind: "file",
              size: 1024,
              mtime: "yesterday",
            },
          ],
        }),
      ),
    /invalid modification date/,
  );
});

test("finds the executable in the usual install locations when no path is set", async () => {
  const cargo = join(homedir(), ".cargo/bin/fsearch");
  const only = (path) => async (candidate) => candidate === path;
  assert.equal(await findBinary("", only(cargo)), cargo);
  assert.equal(await findBinary(undefined, only(cargo)), cargo);
  // The historical default preference value means "look around" too.
  assert.equal(await findBinary("~/.local/bin/fsearch", only(cargo)), cargo);
  assert.equal(
    await findBinary("", only("/opt/homebrew/bin/fsearch")),
    "/opt/homebrew/bin/fsearch",
  );
  // ~/.local/bin wins when both exist, matching the old behaviour.
  assert.equal(
    await findBinary("", async () => true),
    join(homedir(), ".local/bin/fsearch"),
  );
  // An explicit path is used as given, but must exist.
  assert.equal(
    await findBinary("/opt/fsearch", async () => true),
    "/opt/fsearch",
  );
  await assert.rejects(
    findBinary("/opt/fsearch", async () => false),
    /Could not run FSearch at \/opt\/fsearch/,
  );
  await assert.rejects(
    findBinary("", async () => false),
    (error) =>
      error instanceof SearchError &&
      error.kind === "missing" &&
      /not installed/.test(error.message) &&
      /\.cargo\/bin/.test(error.message),
  );
});

test("install command runs the found cargo by path, adds Rust only when it is missing, and quotes for AppleScript", () => {
  assert.equal(
    installCommand("cargo"),
    "cargo install --git https://github.com/noahdunnagan/fsearch",
  );
  assert.equal(
    installCommand("/opt/homebrew/bin/cargo"),
    "/opt/homebrew/bin/cargo install --git https://github.com/noahdunnagan/fsearch",
  );
  assert.equal(
    installCommand("/Users/Jo O'Neil/.cargo/bin/cargo"),
    "'/Users/Jo O'\\''Neil/.cargo/bin/cargo' install --git https://github.com/noahdunnagan/fsearch",
  );
  assert.match(
    installCommand(undefined),
    /^curl .*sh\.rustup\.rs \| sh -s -- -y && \. "\$HOME\/\.cargo\/env" && cargo install --git/,
  );
  assert.equal(
    appleScriptString(installCommand(undefined)),
    `"${installCommand(undefined).replace(/"/g, '\\"')}"`,
  );
  assert.equal(appleScriptString('a\\b "c"'), '"a\\\\b \\"c\\""');
});

test("content searches are the ones that read inside files", () => {
  assert.equal(isContentSearch("grep:hello ext:md"), true);
  assert.equal(isContentSearch("regex:^TODO"), true);
  assert.equal(isContentSearch("sym:main"), true);
  assert.equal(isContentSearch("invoice ext:pdf mtime:<30d"), false);
});
