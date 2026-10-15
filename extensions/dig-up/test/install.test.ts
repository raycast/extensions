// Offline tests for engine/paths.ts and engine/install.ts: a local HTTP server stands in for GitHub and Hugging Face.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  LLAMA_RELEASE,
  MODEL_FILES,
  findLlama,
  findModels,
  formatBytes,
  installLlama,
  installModels,
  locateLlama,
  locateModels,
  sha256,
  type InstallProgress,
  type LlamaRelease,
  type ModelFile,
  type ModelFiles,
} from "../engine/install";
import { makePaths } from "../engine/paths";

const roots: string[] = [];
function tempDir(): string {
  // The real path: locateModels resolves symlinks and /var is one on macOS.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "digup-install-")));
  roots.push(dir);
  return dir;
}
after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

/** Repeatable noise, so a wrong offset shows up as a wrong checksum. */
function noise(length: number, seed: number): Buffer {
  const buffer = Buffer.alloc(length);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    buffer[i] = state >> 16;
  }
  return buffer;
}
const hash = (data: Buffer) => createHash("sha256").update(data).digest("hex");

describe("makePaths", () => {
  it("lays out the support folder", () => {
    const support = "/Users/someone/Library/Application Support/com.raycast.macos/extensions/dig-up";
    const paths = makePaths(support, "/assets");
    assert.equal(paths.indexDir, `${support}/index.noindex`);
    assert.equal(paths.mainDb, `${support}/index.noindex/index.sqlite`);
    assert.equal(paths.codeDb, `${support}/index.noindex/code.sqlite`);
    assert.equal(paths.costs, `${support}/index.noindex/costs.json`);
    assert.equal(paths.logs, `${support}/logs`);
    assert.equal(paths.llamaDir, `${support}/llama`);
    assert.equal(paths.modelsDir, `${support}/models`);
    assert.equal(paths.thumbs, `${support}/thumbs`);
    assert.equal(paths.configFile, `${support}/config.json`);
    assert.equal(paths.pidFile, `${support}/daemon.pid`);
    assert.equal(paths.helperBin, "/assets/digup-helper");
    assert.equal(paths.daemonJs, "/assets/daemon.js");
    assert.equal(paths.scratch, join(tmpdir(), `DigUpRaycast-${process.pid}`));
  });

  it("keeps the socket path short and tied to the support folder", () => {
    const a = makePaths("/a/support", "/assets").socket;
    const b = makePaths("/b/support", "/assets").socket;
    assert.match(a, new RegExp(`^/tmp/digup-${process.getuid?.()}-[0-9a-f]{8}/d\\.sock$`));
    assert.notEqual(a, b);
    assert.ok(Buffer.byteLength(a) < 104);
    assert.equal(a, makePaths("/a/support", "/elsewhere").socket);
    // sha1("/a/support") starts with this
    assert.ok(a.includes(createHash("sha1").update("/a/support").digest("hex").slice(0, 8)));
  });
});

// ---------------------------------------------------------------------------------------------------------------------

function fakeServer(dir: string, build: number | null, mode = 0o755): string {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "llama-server");
  const output = build === null ? "" : `echo "version: 0.6.0-dev (build ${build}, commit abc1234)" >&2\n`;
  writeFileSync(file, `#!/bin/sh\n${output}`);
  chmodSync(file, mode);
  return file;
}

describe("locating llama-server", () => {
  const support = tempDir();
  const paths = makePaths(join(support, "support"), join(support, "assets"));
  /** No installed release here, so an override that fails has nothing to fall back to. */
  const bare = makePaths(join(support, "bare"), join(support, "assets"));

  it("reports a missing file with a reason", () => {
    const result = findLlama(paths, null);
    assert.equal(result.bin, null);
    assert.match(result.bin === null ? result.reason : "", /no llama-server at .*llama-b11624/);
    assert.equal(locateLlama(paths, null), null);
  });

  it("finds the default install and reads its build", () => {
    const bin = fakeServer(join(paths.llamaDir, "llama-b11624"), 11624);
    assert.equal(locateLlama(paths, null), bin);
    const result = findLlama(paths, null);
    assert.deepEqual(result, { bin, build: 11624 });
  });

  it("refuses a build that cannot load EmbeddingGemma 2", () => {
    const old = fakeServer(join(support, "old"), 11429);
    const result = findLlama(bare, old);
    assert.equal(result.bin, null);
    assert.match(result.bin === null ? result.reason : "", /build 11429.*11452/);
    // the first build with the model is fine
    assert.equal(locateLlama(bare, fakeServer(join(support, "min"), 11452)), join(support, "min", "llama-server"));
  });

  it("uses a working override before the installed release", () => {
    const newer = fakeServer(join(support, "newer"), 11700);
    assert.deepEqual(findLlama(paths, newer), { bin: newer, build: 11700 });
  });

  it("falls back to the installed release when the override can't be used, and says why", () => {
    const installed = join(paths.llamaDir, "llama-b11624", "llama-server");
    const bad = fakeServer(join(support, "bad"), 11000);
    assert.deepEqual(findLlama(paths, bad), {
      bin: installed,
      build: 11624,
      ignored: `${bad} is build 11000; EmbeddingGemma 2 needs build 11452 or newer`,
    });
    assert.equal(locateLlama(paths, join(support, "nowhere", "llama-server")), installed);
  });

  it("gives both reasons when neither the override nor the installed release works", () => {
    const bad = fakeServer(join(support, "bad2"), 11000);
    const result = findLlama(bare, bad);
    assert.equal(result.bin, null);
    assert.match(result.bin === null ? result.reason : "", /build 11000.*; no llama-server at .*llama-b11624/);
  });

  it("explains a binary it cannot read or run", () => {
    const silent = fakeServer(join(support, "silent"), null);
    const noBuild = findLlama(bare, silent);
    assert.match(noBuild.bin === null ? noBuild.reason : "", /can't read the build number/);
    const locked = fakeServer(join(support, "locked"), 11624, 0o644);
    const notRunnable = findLlama(bare, locked);
    assert.match(notRunnable.bin === null ? notRunnable.reason : "", /can't run/);
  });

  it("notices a replaced file", () => {
    const bin = fakeServer(join(support, "swap"), 11500);
    assert.equal(locateLlama(bare, bin), bin);
    fakeServer(join(support, "swap"), 11400);
    assert.equal(locateLlama(bare, bin), null);
  });

  it("runs the real vendored build when it is there", { skip: !existsSync(vendored()) }, () => {
    const result = findLlama(paths, vendored());
    assert.equal(result.bin, vendored());
    assert.equal(result.bin === null ? 0 : result.build, 11624);
  });
});

function vendored(): string {
  return resolve(import.meta.dirname, "../.vendor/llama-b11624/llama-server");
}

// ---------------------------------------------------------------------------------------------------------------------

describe("locating the model files", () => {
  const files: ModelFiles = {
    text: { name: "text.gguf", bytes: 100, sha256: "", url: "" },
    media: { name: "media.gguf", bytes: 200, sha256: "", url: "" },
  };
  const make = () => {
    const root = tempDir();
    const home = join(root, "home");
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const hub = join(root, "hub");
    const snapshot = join(
      hub,
      "models--ggml-org--embeddinggemma-2-GGUF/snapshots/bfcd298762cc34d0357ece5ebdd31791a3a374d8",
    );
    return { root, home, paths, hub, snapshot, options: { files, home, env: { HF_HUB_CACHE: hub } } };
  };
  const put = (folder: string, file: ModelFile, bytes = file.bytes) => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, file.name), Buffer.alloc(bytes, 1));
    return join(folder, file.name);
  };

  it("finds nothing in an empty machine", () => {
    const { paths, options } = make();
    assert.equal(locateModels(paths, null, options), null);
  });

  it("counts a file only at its exact size", () => {
    const { paths, options } = make();
    put(paths.modelsDir, files.text, 99);
    put(paths.modelsDir, files.media, 201);
    assert.equal(locateModels(paths, null, options), null);
    const text = put(paths.modelsDir, files.text);
    assert.deepEqual(locateModels(paths, null, options), { text, media: null });
  });

  it("looks in order: override, our folder, DigUp.app's folder, the Hugging Face cache", () => {
    const { root, home, paths, snapshot, options } = make();
    const cached = put(snapshot, files.text);
    assert.equal(locateModels(paths, null, options)?.text, cached);
    const digup = put(join(home, "Library/Application Support/DigUp/Models"), files.text);
    assert.equal(locateModels(paths, null, options)?.text, digup);
    const ours = put(paths.modelsDir, files.text);
    assert.equal(locateModels(paths, null, options)?.text, ours);
    const chosen = put(join(root, "chosen"), files.text);
    assert.equal(locateModels(paths, join(root, "chosen"), options)?.text, chosen);
  });

  it("looks only in a chosen folder, and says why it found nothing there (DigUp: LlamaModels.folders)", () => {
    const { root, paths, options } = make();
    put(paths.modelsDir, files.text);
    put(paths.modelsDir, files.media);
    mkdirSync(join(root, "empty"));
    assert.equal(locateModels(paths, join(root, "empty"), options), null);
    assert.deepEqual(findModels(paths, join(root, "empty"), options), {
      text: null,
      media: null,
      reason: "Those aren't the model's files",
    });
    put(join(root, "wrong"), files.text, 1500);
    assert.deepEqual(findModels(paths, join(root, "wrong"), options), {
      text: null,
      media: null,
      reason: "The chosen text.gguf is 2 KB, not 100 bytes",
    });
    const half = put(join(root, "half"), files.text);
    assert.deepEqual(findModels(paths, join(root, "half"), options), {
      text: half,
      media: null,
      reason: `no media.gguf in ${join(root, "half")}`,
    });
  });

  it("names every folder it looked in when there is no chosen one", () => {
    const { paths, snapshot, options } = make();
    assert.deepEqual(findModels(paths, null, options), {
      text: null,
      media: null,
      reason: `no text.gguf in ${paths.modelsDir}, ~/Library/Application Support/DigUp/Models, ${snapshot}`,
    });
  });

  it("takes the two files from where each is", () => {
    const { home, paths, options } = make();
    const text = put(paths.modelsDir, files.text);
    const media = put(join(home, "Library/Application Support/DigUp/Models"), files.media);
    assert.deepEqual(locateModels(paths, null, options), { text, media });
  });

  it("follows the Hugging Face cache's symlinks to the blob", () => {
    const { root, paths, snapshot, options } = make();
    mkdirSync(snapshot, { recursive: true });
    const blob = put(join(root, "blobs"), { ...files.text, name: "abc123" });
    symlinkSync(blob, join(snapshot, files.text.name));
    assert.equal(locateModels(paths, null, options)?.text, blob);
  });

  it("finds the cache through HF_HOME, then ~/.cache", () => {
    const { root, home, paths } = make();
    const viaHome = put(
      join(
        root,
        "hf-home/hub/models--ggml-org--embeddinggemma-2-GGUF/snapshots/bfcd298762cc34d0357ece5ebdd31791a3a374d8",
      ),
      files.text,
    );
    assert.equal(locateModels(paths, null, { files, home, env: { HF_HOME: join(root, "hf-home") } })?.text, viaHome);
    const dotCache = put(
      join(
        home,
        ".cache/huggingface/hub/models--ggml-org--embeddinggemma-2-GGUF/snapshots/bfcd298762cc34d0357ece5ebdd31791a3a374d8",
      ),
      files.text,
    );
    assert.equal(locateModels(paths, null, { files, home, env: {} })?.text, dotCache);
  });
});

describe("formatBytes", () => {
  it("writes sizes as Foundation's ByteCountFormatter does (.file, en_US)", () => {
    // Measured with ByteCountFormatter.string(fromByteCount:countStyle: .file) on macOS 26, -AppleLocale en_US.
    const measured: Array<[number, string]> = [
      [0, "Zero KB"],
      [1, "1 byte"],
      [999, "999 bytes"],
      [1000, "1 KB"],
      [1499, "1 KB"],
      [1500, "2 KB"],
      [9999, "10 KB"],
      [99_499, "99 KB"],
      [999_499, "999 KB"],
      [999_500, "1 MB"],
      [1_000_000, "1 MB"],
      [1_049_999, "1 MB"],
      [1_050_000, "1.1 MB"],
      [1_234_567, "1.2 MB"],
      [9_950_000, "10 MB"],
      [99_950_000, "100 MB"],
      [200_000_000, "200 MB"],
      [309_855_456, "309.9 MB"],
      [554_821_024, "554.8 MB"],
      [864_676_480, "864.7 MB"],
      [999_499_999, "999.5 MB"],
      [999_500_000, "999.5 MB"],
      [999_999_999, "1 GB"],
      [1_000_000_000, "1 GB"],
      [1_064_676_480, "1.06 GB"],
      [1_234_567_890, "1.23 GB"],
      [1_250_000_000, "1.25 GB"],
      [1_255_000_000, "1.26 GB"],
      [9_999_999_999, "10 GB"],
      [12_345_678_901, "12.35 GB"],
      [123_456_789_012, "123.46 GB"],
      [1_000_000_000_001, "1 TB"],
      [1_000_000_000_000_001, "1 PB"],
    ];
    for (const [count, text] of measured) assert.equal(formatBytes(count), text, String(count));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A stand-in for Hugging Face: /resolve/<name> redirects to a CDN path that honours Range.

interface Behavior {
  /** Statuses to answer with, one per CDN request, before serving normally. */
  fail: number[];
  ignoreRange: boolean;
  /** Next ranged answer claims to start at 0. */
  badContentRange: boolean;
  /** Next answer sends this many bytes and drops the connection. */
  cutAt: number | null;
  /** Next answer sends the right length of the wrong bytes. */
  corrupt: boolean;
}

interface Request {
  path: string;
  range: string | undefined;
}

function startHost(content: Map<string, Buffer>) {
  const requests: Request[] = [];
  const behavior: Behavior = { fail: [], ignoreRange: false, badContentRange: false, cutAt: null, corrupt: false };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://host");
    const range = req.headers.range;
    requests.push({ path: url.pathname, range });
    const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    if (url.pathname.startsWith("/resolve/")) {
      res.writeHead(302, { location: `/cdn/${encodeURIComponent(name)}?signature=abc` });
      return res.end();
    }
    const status = behavior.fail.shift();
    if (status) {
      res.writeHead(status);
      return res.end("no");
    }
    let body = content.get(name);
    if (!body) {
      res.writeHead(404);
      return res.end();
    }
    if (behavior.corrupt) {
      behavior.corrupt = false;
      body = Buffer.from(body);
      body[body.length >> 1] ^= 0xff;
    }
    const match = /^bytes=(\d+)-$/.exec(range ?? "");
    const start = match && !behavior.ignoreRange ? Number(match[1]) : 0;
    if (start >= body.length && start > 0) {
      // As real servers do, for a range that starts at or past the end.
      res.writeHead(416, { "content-range": `bytes */${body.length}` });
      return res.end();
    }
    if (match && !behavior.ignoreRange) {
      const claimed = behavior.badContentRange ? 0 : start;
      behavior.badContentRange = false;
      res.writeHead(206, {
        "content-range": `bytes ${claimed}-${body.length - 1}/${body.length}`,
        "content-length": body.length - start,
      });
    } else {
      res.writeHead(200, { "content-length": body.length });
    }
    const slice = body.subarray(start);
    if (behavior.cutAt !== null) {
      const cut = behavior.cutAt;
      behavior.cutAt = null;
      res.write(slice.subarray(0, cut));
      setTimeout(() => res.destroy(), 20);
      return;
    }
    res.end(slice);
  });
  return new Promise<{ base: string; requests: Request[]; behavior: Behavior; close: () => void }>((resolveStart) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolveStart({
        base: `http://127.0.0.1:${port}`,
        requests,
        behavior,
        close: () => {
          server.closeAllConnections();
          server.close();
        },
      });
    });
  });
}

describe("installModels", () => {
  const textBytes = noise(300_000, 1);
  const mediaBytes = noise(150_000, 2);
  let host: Awaited<ReturnType<typeof startHost>>;
  let files: ModelFiles;

  before(async () => {
    host = await startHost(
      new Map([
        ["text.gguf", textBytes],
        ["media.gguf", mediaBytes],
      ]),
    );
    const file = (name: string, data: Buffer): ModelFile => ({
      name,
      bytes: data.length,
      sha256: hash(data),
      url: `${host.base}/resolve/${name}`,
    });
    files = { text: file("text.gguf", textBytes), media: file("media.gguf", mediaBytes) };
  });
  after(() => host.close());

  const fresh = () => {
    const root = tempDir();
    host.requests.length = 0;
    Object.assign(host.behavior, { fail: [], ignoreRange: false, badContentRange: false, cutAt: null, corrupt: false });
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const events: InstallProgress[] = [];
    const options = {
      files,
      home: join(root, "home"),
      env: { HF_HUB_CACHE: join(root, "hub") },
      retryDelaysMs: [1],
      excludeFromBackup: false,
    };
    return { root, paths, events, options, progress: (p: InstallProgress) => events.push(p) };
  };
  const partialOf = (paths: { modelsDir: string }, file: ModelFile) => join(paths.modelsDir, `${file.name}.partial`);
  const writePartial = (paths: { modelsDir: string }, file: ModelFile, data: Buffer) => {
    mkdirSync(paths.modelsDir, { recursive: true });
    writeFileSync(partialOf(paths, file), data);
  };
  const assertInstalled = (paths: { modelsDir: string }, result: { text: string; media: string }) => {
    assert.equal(result.text, join(paths.modelsDir, "text.gguf"));
    assert.equal(result.media, join(paths.modelsDir, "media.gguf"));
    assert.ok(readFileSync(result.text).equals(textBytes));
    assert.ok(readFileSync(result.media).equals(mediaBytes));
    assert.equal(existsSync(partialOf(paths, files.text)), false);
    assert.equal(existsSync(partialOf(paths, files.media)), false);
  };

  it("downloads both files across the redirect and reports progress", async () => {
    const { paths, events, options, progress } = fresh();
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.deepEqual(
      host.requests.map((r) => r.path),
      ["/resolve/text.gguf", "/cdn/text.gguf", "/resolve/media.gguf", "/cdn/media.gguf"],
    );
    const total = textBytes.length + mediaBytes.length;
    assert.ok(events.length > 0 && events.every((e) => e.total === total));
    const downloading = events.filter((e) => e.phase === "downloading").map((e) => e.bytes);
    assert.deepEqual(
      [...downloading].sort((a, b) => a - b),
      downloading,
      "progress never goes back",
    );
    assert.equal(downloading.at(-1), total);
    assert.deepEqual(
      events.filter((e) => e.phase === "verifying").map((e) => e.what),
      ["text.gguf", "media.gguf"],
    );
    assert.equal(events.at(-1)?.phase, "verifying");
    assert.equal(events.at(-1)?.bytes, total);
  });

  it("resumes with a Range that survives the redirect", async () => {
    const { paths, options, progress } = fresh();
    writePartial(paths, files.text, textBytes.subarray(0, 100_000));
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.deepEqual(
      host.requests.slice(0, 2).map((r) => r.range),
      ["bytes=100000-", "bytes=100000-"],
    );
    assert.equal(host.requests[2].range, undefined);
  });

  it("starts over when the server answers 200 to a ranged request", async () => {
    const { paths, options, progress } = fresh();
    writePartial(paths, files.text, textBytes.subarray(0, 5000));
    host.behavior.ignoreRange = true;
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.equal(host.requests[1].range, "bytes=5000-");
  });

  it("throws away a partial that is bigger than the file", async () => {
    const { paths, options, progress } = fresh();
    writePartial(paths, files.text, Buffer.concat([textBytes, Buffer.from("extra")]));
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.equal(host.requests[0].range, undefined);
  });

  it("checks a complete partial without downloading it again", async () => {
    const { paths, options, progress } = fresh();
    writePartial(paths, files.text, textBytes);
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.ok(!host.requests.some((r) => r.path.endsWith("text.gguf") && r.path.startsWith("/cdn")));
  });

  it("deletes the partial and tries again when Content-Range is not where it asked", async () => {
    const { paths, options, progress } = fresh();
    writePartial(paths, files.text, textBytes.subarray(0, 40_000));
    host.behavior.badContentRange = true;
    assertInstalled(paths, await installModels(paths, progress, options));
    const textRequests = host.requests.filter((r) => r.path === "/cdn/text.gguf");
    assert.deepEqual(
      textRequests.map((r) => r.range),
      ["bytes=40000-", undefined],
    );
  });

  it("retries 503 and 429, and gives up on a 404 at once", async () => {
    const { paths, options, progress } = fresh();
    host.behavior.fail = [503, 429];
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.equal(host.requests.filter((r) => r.path === "/cdn/text.gguf").length, 3);

    const missing = fresh();
    const gone: ModelFiles = { ...files, text: { ...files.text, url: `${host.base}/resolve/nothing.gguf` } };
    await assert.rejects(installModels(missing.paths, missing.progress, { ...missing.options, files: gone }), {
      message: "Hugging Face answered 404", // DigUp's words, whatever the host (FileFetcher.swift)
    });
    assert.equal(host.requests.filter((r) => r.path === "/cdn/nothing.gguf").length, 1);
  });

  it("keeps trying the network for as long as it takes, saying that it waits (DigUp: no limit)", async () => {
    const { paths, events, options, progress } = fresh();
    host.behavior.fail = Array(12).fill(503);
    assertInstalled(paths, await installModels(paths, progress, options));
    const waits = events.filter((e) => e.phase === "retrying");
    assert.equal(waits.length, 12);
    assert.deepEqual(waits[0], {
      phase: "retrying",
      what: "text.gguf",
      bytes: 0,
      total: 450_000,
      error: "Hugging Face answered 503",
    });
  });

  it("gives up after too many tries in a row without progress, when told to", async () => {
    const { paths, options, progress } = fresh();
    host.behavior.fail = [500, 500, 500, 500];
    await assert.rejects(installModels(paths, progress, { ...options, maxFailures: 2 }), /answered 500/);
    assert.equal(host.requests.filter((r) => r.path === "/cdn/text.gguf").length, 3);
  });

  it("stops at once when the file can't be saved, as DigUp does (no retry for a disk problem)", async () => {
    const { paths, options, progress } = fresh();
    mkdirSync(paths.modelsDir, { recursive: true });
    chmodSync(paths.modelsDir, 0o555);
    try {
      // A cap, so that a disk error taken for the network fails here instead of retrying for ever.
      await assert.rejects(installModels(paths, progress, { ...options, maxFailures: 2 }), (error: Error) => {
        assert.match(error.message, /^Can't save the model: EACCES: permission denied, open '.*text\.gguf\.partial'$/);
        return true;
      });
    } finally {
      chmodSync(paths.modelsDir, 0o755);
    }
    assert.equal(host.requests.filter((r) => r.path === "/cdn/text.gguf").length, 1);
  });

  it("says which folder it can't create, home abbreviated (DigUp: \"Can't create <path>\")", async () => {
    const { root, options, progress } = fresh();
    const home = join(root, "home");
    mkdirSync(join(home, "locked"), { recursive: true });
    chmodSync(join(home, "locked"), 0o555);
    const paths = makePaths(join(home, "locked", "support"), join(root, "assets"));
    try {
      await assert.rejects(installModels(paths, progress, { ...options, home }), {
        message: "Can't create ~/locked/support/models",
      });
    } finally {
      chmodSync(join(home, "locked"), 0o755);
    }
  });

  it("runs one install per folder: a second call gets the running one", async () => {
    const { paths, options, progress } = fresh();
    // Two installs on one .partial would fight for ever: stop whatever still runs when the test ends.
    const controller = new AbortController();
    const guarded = { ...options, signal: controller.signal };
    try {
      const first = installModels(paths, progress, guarded);
      const second = installModels(paths, () => {}, guarded);
      assert.equal(second, first);
      assertInstalled(paths, await first);
      assert.equal(host.requests.filter((r) => r.path === "/cdn/text.gguf").length, 1);
      assert.equal(host.requests.filter((r) => r.path === "/cdn/media.gguf").length, 1);
      const again = installModels(paths, progress, guarded);
      assert.notEqual(again, first, "a finished install doesn't hold the folder");
      assertInstalled(paths, await again);
    } finally {
      controller.abort(new Error("test over"));
    }
  });

  it("resumes after the connection drops mid-file", async () => {
    const { paths, options, progress } = fresh();
    host.behavior.cutAt = 120_000;
    assertInstalled(paths, await installModels(paths, progress, options));
    const ranges = host.requests.filter((r) => r.path === "/cdn/text.gguf").map((r) => r.range);
    assert.equal(ranges[0], undefined);
    assert.match(ranges[1] ?? "", /^bytes=\d+-$/);
    assert.ok(Number((ranges[1] ?? "").slice(6, -1)) > 0, "the second try carries on from the bytes already on disk");
  });

  it("downloads a file again once when it fails its checksum, and fails the second time", async () => {
    const once = fresh();
    host.behavior.corrupt = true;
    assertInstalled(once.paths, await installModels(once.paths, once.progress, once.options));
    assert.equal(host.requests.filter((r) => r.path === "/cdn/text.gguf").length, 2);

    const twice = fresh();
    const wrongHash: ModelFiles = { ...files, text: { ...files.text, sha256: "0".repeat(64) } };
    await assert.rejects(installModels(twice.paths, twice.progress, { ...twice.options, files: wrongHash }), {
      message: "The download was damaged twice. Try again later.",
    });
    assert.equal(existsSync(partialOf(twice.paths, files.text)), false);
    assert.equal(existsSync(join(twice.paths.modelsDir, "text.gguf")), false);
  });

  it("keeps a verified file and downloads only what is missing", async () => {
    const { paths, events, options, progress } = fresh();
    mkdirSync(paths.modelsDir, { recursive: true });
    writeFileSync(join(paths.modelsDir, "text.gguf"), textBytes);
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.deepEqual(
      host.requests.map((r) => r.path),
      ["/resolve/media.gguf", "/cdn/media.gguf"],
    );
    // Progress counts the kept file: every report is about the media file and starts past the text file's bytes.
    const downloading = events.filter((e) => e.phase === "downloading");
    assert.ok(downloading.length > 0);
    for (const event of downloading) {
      assert.equal(event.what, "media.gguf");
      assert.ok(
        event.bytes > textBytes.length && event.bytes <= textBytes.length + mediaBytes.length,
        String(event.bytes),
      );
    }
    assert.equal(downloading.at(-1)?.bytes, textBytes.length + mediaBytes.length);
  });

  it("copies a file from the Hugging Face cache instead of downloading it", async () => {
    const { root, paths, options, progress } = fresh();
    const snapshot = join(
      root,
      "hub/models--ggml-org--embeddinggemma-2-GGUF/snapshots/bfcd298762cc34d0357ece5ebdd31791a3a374d8",
    );
    mkdirSync(snapshot, { recursive: true });
    writeFileSync(join(snapshot, "text.gguf"), textBytes);
    writeFileSync(join(snapshot, "media.gguf"), Buffer.alloc(mediaBytes.length)); // right size, wrong bytes
    assertInstalled(paths, await installModels(paths, progress, options));
    assert.ok(!host.requests.some((r) => r.path.includes("text.gguf")), "text came from the cache");
    assert.ok(
      host.requests.some((r) => r.path === "/cdn/media.gguf"),
      "a cached copy that fails its checksum is downloaded instead",
    );
  });

  it("downloads a file when the Hugging Face cache's copy can't be read", async () => {
    const { root, paths, options, progress } = fresh();
    const snapshot = join(
      root,
      "hub/models--ggml-org--embeddinggemma-2-GGUF/snapshots/bfcd298762cc34d0357ece5ebdd31791a3a374d8",
    );
    mkdirSync(snapshot, { recursive: true });
    writeFileSync(join(snapshot, "text.gguf"), textBytes);
    chmodSync(join(snapshot, "text.gguf"), 0o000);
    try {
      assertInstalled(paths, await installModels(paths, progress, options));
    } finally {
      chmodSync(join(snapshot, "text.gguf"), 0o644);
    }
    assert.ok(host.requests.some((r) => r.path === "/cdn/text.gguf"));
  });

  it("refuses to start without room for the files", async () => {
    const { paths, options, progress } = fresh();
    await assert.rejects(installModels(paths, progress, { ...options, spareBytes: 4_500_000_000_000_000 }), {
      message: "Needs 4.5 PB free on this disk",
    });
    assert.equal(host.requests.length, 0);
  });

  it("stops when asked to", async () => {
    const { paths, options, progress } = fresh();
    const controller = new AbortController();
    host.behavior.fail = [503, 503, 503];
    const done = installModels(paths, progress, { ...options, retryDelaysMs: [5000], signal: controller.signal });
    setTimeout(() => controller.abort(new Error("cancelled")), 100);
    await assert.rejects(done, /cancelled/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe("installLlama", () => {
  const dir = "llama-b11624";
  const buildArchive = (root: string, build: number, entry = dir) => {
    const staging = join(root, "staging");
    mkdirSync(join(staging, entry), { recursive: true });
    fakeServer(join(staging, entry), build);
    writeFileSync(join(staging, entry, "libllama.dylib"), "x");
    const archive = join(root, "release.tar.gz");
    execFileSync("/usr/bin/tar", ["-czf", archive, "-C", staging, entry]);
    return archive;
  };
  let host: Awaited<ReturnType<typeof startHost>>;
  const archives = new Map<string, Buffer>();
  before(async () => {
    host = await startHost(archives);
  });
  after(() => host.close());

  const release = (data: Buffer, name: string, sha = hash(data)): LlamaRelease => {
    archives.set(name, data);
    return { url: `${host.base}/resolve/${name}`, sha256: sha, dir };
  };

  it("downloads, checks, unpacks and finds the server", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const events: InstallProgress[] = [];
    const data = readFileSync(buildArchive(root, 11624));
    const bin = await installLlama(paths, (p) => events.push(p), { release: release(data, "ok.tar.gz") });
    assert.equal(bin, join(paths.llamaDir, dir, "llama-server"));
    assert.deepEqual(findLlama(paths, null), { bin, build: 11624 });
    assert.ok(existsSync(join(paths.llamaDir, dir, "libllama.dylib")));
    assert.equal(existsSync(join(paths.llamaDir, `${dir}.tar.gz`)), false);
    assert.equal(existsSync(join(paths.llamaDir, `${dir}.tar.gz.partial`)), false);
    assert.equal(events.at(-1)?.phase, "verifying");
    assert.ok(events.some((e) => e.phase === "downloading" && e.bytes === data.length && e.total === data.length));
  });

  it("does nothing when a good server is already there", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const existing = fakeServer(join(paths.llamaDir, dir), 11624);
    host.requests.length = 0;
    assert.equal(
      await installLlama(paths, () => {}, { release: release(Buffer.from("unused"), "unused.tar.gz") }),
      existing,
    );
    assert.equal(host.requests.length, 0);
  });

  it("resumes an interrupted download with a Range, its size unpinned", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624));
    const pinned = release(data, "resume.tar.gz");
    mkdirSync(paths.llamaDir, { recursive: true });
    writeFileSync(join(paths.llamaDir, `${dir}.tar.gz.partial`), data.subarray(0, data.length >> 1));
    host.requests.length = 0;
    const events: InstallProgress[] = [];
    assert.equal(
      await installLlama(paths, (p) => events.push(p), { release: pinned }),
      join(paths.llamaDir, dir, "llama-server"),
    );
    assert.deepEqual(
      host.requests.map((r) => r.range),
      [`bytes=${data.length >> 1}-`, `bytes=${data.length >> 1}-`],
    );
    assert.ok(events.some((e) => e.phase === "downloading" && e.bytes === data.length && e.total === data.length));
  });

  it("uses a finished download an earlier run left without asking for more", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624));
    const pinned = release(data, "finished.tar.gz");
    mkdirSync(paths.llamaDir, { recursive: true });
    writeFileSync(join(paths.llamaDir, `${dir}.tar.gz.partial`), data);
    host.requests.length = 0;
    assert.equal(await installLlama(paths, () => {}, { release: pinned }), join(paths.llamaDir, dir, "llama-server"));
    assert.equal(host.requests.length, 0);
  });

  it("starts over when the server won't resume a partial longer than the file", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624));
    const pinned = release(data, "longer.tar.gz");
    mkdirSync(paths.llamaDir, { recursive: true });
    writeFileSync(join(paths.llamaDir, `${dir}.tar.gz.partial`), Buffer.concat([data, Buffer.from("junk")]));
    host.requests.length = 0;
    assert.equal(
      await installLlama(paths, () => {}, { release: pinned, retryDelaysMs: [1] }),
      join(paths.llamaDir, dir, "llama-server"),
    );
    const cdn = host.requests.filter((r) => r.path.startsWith("/cdn/"));
    assert.deepEqual(
      cdn.map((r) => r.range),
      [`bytes=${data.length + 4}-`, undefined],
    );
  });

  it("rejects an archive that fails its checksum", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624));
    await assert.rejects(
      installLlama(paths, () => {}, { release: release(data, "bad.tar.gz", "0".repeat(64)) }),
      /failed its checksum/,
    );
    assert.equal(existsSync(join(paths.llamaDir, dir)), false);
  });

  it("rejects an archive whose build is too old", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11429));
    await assert.rejects(
      installLlama(paths, () => {}, { release: release(data, "old.tar.gz") }),
      /build 11429/,
    );
  });

  it("runs one install per folder, and names GitHub when it refuses", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624));
    const pinned = release(data, "once.tar.gz");
    host.requests.length = 0;
    const controller = new AbortController(); // as for the model: nothing may outlive the test
    try {
      const first = installLlama(paths, () => {}, { release: pinned, signal: controller.signal });
      assert.equal(
        installLlama(paths, () => {}, { release: pinned, signal: controller.signal }),
        first,
      );
      assert.equal(await first, join(paths.llamaDir, dir, "llama-server"));
    } finally {
      controller.abort(new Error("test over"));
    }
    assert.equal(host.requests.filter((r) => r.path.startsWith("/cdn/")).length, 1);

    const other = makePaths(join(root, "other"), join(root, "assets"));
    const missing = { url: `${host.base}/resolve/missing.tar.gz`, sha256: "0".repeat(64), dir };
    await assert.rejects(
      installLlama(other, () => {}, { release: missing }),
      { message: "GitHub answered 404" },
    );
  });

  it("rejects an archive with files outside its folder", async () => {
    const root = tempDir();
    const paths = makePaths(join(root, "support"), join(root, "assets"));
    const data = readFileSync(buildArchive(root, 11624, "elsewhere"));
    await assert.rejects(
      installLlama(paths, () => {}, { release: release(data, "other.tar.gz") }),
      /unexpected path/,
    );
    assert.equal(existsSync(join(paths.llamaDir, "elsewhere")), false);
  });
});

describe("sha256", () => {
  it("matches the digest of the bytes", async () => {
    const file = join(tempDir(), "data");
    const data = noise(20_000_000, 7); // bigger than one 8 MB piece
    writeFileSync(file, data);
    assert.equal(await sha256(file), hash(data));
  });
});

describe("what is pinned", () => {
  it("is DigUp's model files (ModelFiles.swift) and llama.cpp b11624", () => {
    const resolve =
      "https://huggingface.co/ggml-org/embeddinggemma-2-GGUF/resolve/bfcd298762cc34d0357ece5ebdd31791a3a374d8";
    assert.deepEqual(MODEL_FILES, {
      text: {
        name: "embeddinggemma-2-Q8_0.gguf",
        bytes: 309_855_456,
        sha256: "2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135",
        url: `${resolve}/embeddinggemma-2-Q8_0.gguf`,
      },
      media: {
        name: "mmproj-embeddinggemma-2-Q8_0.gguf",
        bytes: 554_821_024,
        sha256: "c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f",
        url: `${resolve}/mmproj-embeddinggemma-2-Q8_0.gguf`,
      },
    });
    assert.deepEqual(LLAMA_RELEASE, {
      url: "https://github.com/ggml-org/llama.cpp/releases/download/b11624/llama-b11624-bin-macos-arm64.tar.gz",
      sha256: "5bd8555c20e5d6d45831c038f484769245e5bcc1c265c4911c6ae15e4d9a35df",
      dir: "llama-b11624",
    });
  });

  const digup = join(homedir(), "Library/Application Support/DigUp/Models");
  it("finds DigUp.app's own copy of the model", { skip: !existsSync(digup) && `no ${digup}` }, () => {
    const paths = makePaths(join(tempDir(), "support"), "/assets");
    assert.deepEqual(locateModels(paths, null, { env: {} }), {
      text: join(digup, "embeddinggemma-2-Q8_0.gguf"),
      media: join(digup, "mmproj-embeddinggemma-2-Q8_0.gguf"),
    });
  });
});
