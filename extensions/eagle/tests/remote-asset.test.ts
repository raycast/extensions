import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { Agent, createServer, RequestListener } from "node:http";
import { createConnection, LookupFunction } from "node:net";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import axios from "axios";
import { downloadRemoteAsset, inspectRemoteAsset } from "../src/utils/remote-asset";

async function localTransport(t: Parameters<Parameters<typeof test>[1]>[0], handler: RequestListener) {
  const root = await mkdtemp(join(tmpdir(), "eagle-remote-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const pinned: string[] = [];
  // Exercise the real Axios HTTP adapter and agent. Only the test's final socket
  // is routed to the fixture server after recording the supplied pinned lookup.
  t.mock.method(Agent.prototype, "createConnection", (options) => {
    const lookup = options.lookup as LookupFunction;
    assert.equal(typeof lookup, "function");
    lookup(options.host, { all: true }, (error, addresses) => {
      assert.equal(error, null);
      assert.ok(Array.isArray(addresses));
      pinned.push(...addresses.map((entry) => entry.address));
    });
    return createConnection({ host: "127.0.0.1", port: address.port });
  });
  return { root, pinned };
}

test("DNS rebinding cannot replace the validated address used by the HTTP connection", async (t) => {
  let requests = 0;
  const bytes = Buffer.from("PNG reference bytes");
  const f = await localTransport(t, (request, response) => {
    requests++;
    assert.equal(request.headers.host, "rebind.test");
    response.setHeader("Content-Type", "image/png");
    response.end(bytes);
  });
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async () => {
    throw new Error("An unpinned alternate adapter was selected");
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });
  let resolutions = 0;
  const result = await downloadRemoteAsset("http://rebind.test/download", f.root, {
    resolve: async () => [{ address: ++resolutions === 1 ? "8.8.8.8" : "127.0.0.1", family: 4 }],
  });
  assert.equal(resolutions, 1);
  assert.equal(requests, 1);
  assert.deepEqual(f.pinned, ["8.8.8.8"]);
  assert.deepEqual(await readFile(result.path), bytes);
  assert.equal(result.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(result.size, bytes.length);
  assert.equal(extname(result.path), ".png");
  assert.equal((await stat(result.path)).mode & 0o777, 0o600);
});

test("every public redirect gets a new validated pinned connection and retains the final content extension", async (t) => {
  const f = await localTransport(t, (request, response) => {
    if (request.headers.host === "first.test") {
      response.writeHead(302, { Location: "http://second.test/attachment" });
      response.end();
    } else {
      response.setHeader("Content-Type", "application/octet-stream");
      response.setHeader("Content-Disposition", 'attachment; filename="design.pdf"');
      response.end("PDF fixture");
    }
  });
  const resolved: string[] = [];
  const result = await downloadRemoteAsset("http://first.test/start", f.root, {
    resolve: async (hostname) => {
      resolved.push(hostname);
      return [{ address: hostname === "first.test" ? "8.8.8.8" : "9.9.9.9", family: 4 }];
    },
  });
  assert.deepEqual(resolved, ["first.test", "second.test"]);
  assert.deepEqual(f.pinned, ["8.8.8.8", "9.9.9.9"]);
  assert.equal(result.url, "http://second.test/attachment");
  assert.equal(extname(result.path), ".pdf");
});

test("private redirects are rejected before connecting and partial owned files are removed", async (t) => {
  let requests = 0;
  const f = await localTransport(t, (_request, response) => {
    requests++;
    response.writeHead(302, { Location: "http://127.0.0.1/private" });
    response.end();
  });
  await assert.rejects(
    downloadRemoteAsset("http://public.test/file", f.root, {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
    }),
    /public/,
  );
  assert.equal(requests, 1);
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
});

test("streaming content cap and HTML rejection clean up private staging", async (t) => {
  let bytes = "some fixture bytes";
  const f = await localTransport(t, (_request, response) => {
    response.setHeader("Content-Type", "image/png");
    response.end(bytes);
  });
  const resolve = async () => [{ address: "8.8.8.8", family: 4 }];
  await assert.rejects(
    downloadRemoteAsset("http://public.test/file", f.root, { resolve, maxBytes: 4 }),
    /limit|maxContentLength/,
  );
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
  bytes = "<!doctype html><html>not an image</html>";
  await assert.rejects(downloadRemoteAsset("http://public.test/file", f.root, { resolve }), /HTML/);
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
});

test("total deadline aborts a stalled body and a stalled resolver without leaving staging", async (t) => {
  const f = await localTransport(t, (_request, response) => {
    response.setHeader("Content-Type", "image/png");
    response.write("partial fixture");
  });
  await assert.rejects(
    downloadRemoteAsset("http://public.test/file", f.root, {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
      deadlineMs: 30,
    }),
  );
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
  await assert.rejects(
    downloadRemoteAsset("http://public.test/file", f.root, {
      resolve: () => new Promise(() => {}),
      deadlineMs: 10,
    }),
    /deadline/,
  );
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
});

test("confirmation preview uses pinned transport without staging files", async (t) => {
  const f = await localTransport(t, (_request, response) => {
    response.setHeader("Content-Type", "image/png");
    response.end("PNG preview");
  });
  assert.equal(
    await inspectRemoteAsset("http://preview.test/image", {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
    }),
    "http://preview.test/image",
  );
  assert.deepEqual(f.pinned, ["8.8.8.8"]);
  assert.deepEqual(await readdir(f.root), []);
});

test("full downloads reject partial206 responses while inspection can preview them", async (t) => {
  const f = await localTransport(t, (_request, response) => {
    response.writeHead(206, { "Content-Type": "image/png" });
    response.end("partial fixture");
  });
  const resolve = async () => [{ address: "8.8.8.8", family: 4 }];
  assert.equal(await inspectRemoteAsset("http://public.test/file", { resolve }), "http://public.test/file");
  await assert.rejects(downloadRemoteAsset("http://public.test/file", f.root, { resolve }), /complete file/);
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
});

test("the streaming byte cap applies to decoded gzip bytes", async (t) => {
  const compressed = gzipSync(Buffer.alloc(64 * 1024, "x"));
  assert.ok(compressed.length < 1024);
  const f = await localTransport(t, (_request, response) => {
    response.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
    });
    response.end(compressed);
  });
  await assert.rejects(
    downloadRemoteAsset("http://public.test/file", f.root, {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
      maxBytes: 1024,
    }),
    /limit|maxContentLength/,
  );
  assert.deepEqual(await readdir(join(f.root, "ai-import-staging")), []);
});
