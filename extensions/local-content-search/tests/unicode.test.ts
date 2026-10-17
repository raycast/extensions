import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createServer, request } from "node:http";
import { mkdtemp, mkdir, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { LocalClient } from "../service/client";
import { createService } from "../service/server";
import { paths } from "../service/paths";
import { DEFAULT_CONFIG } from "../service/protocol";
import { startWorker } from "../service/worker";

// Force byte boundaries through multibyte text, rather than relying on OS packet coalescing.
test("native output preserves split UTF-8", async () => {
  const worker = startWorker(
    process.execPath,
    [
      "-e",
      "process.stdout.write(Buffer.from([0xe2]));setTimeout(()=>process.stdout.end(Buffer.from([0x82,0xac])),40)",
    ],
    { models: tmpdir(), memoryLimitMb: 1024, timeoutMs: 3000 },
  );
  assert.equal(await worker.done, "€");
});

test("client preserves split UTF-8 responses", async () => {
  const root = await mkdtemp(join(tmpdir(), "unicode-client-"));
  const socket = join(root, "socket");
  const expected = "/docs/résumé-日本-🐈";
  const server = createServer((_req, res) => {
    void (async () => {
      for (const byte of Buffer.from(
        JSON.stringify({
          version: 1,
          config: { ...DEFAULT_CONFIG, roots: [expected] },
        }),
      )) {
        res.write(Buffer.from([byte]));
        await delay(1);
      }
      res.end();
    })();
  });
  await new Promise<void>((resolve) => server.listen(socket, resolve));
  try {
    assert.deepEqual((await new LocalClient(socket).status()).config.roots, [
      expected,
    ]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test("server preserves split UTF-8 configuration requests", async () => {
  const root = await mkdtemp(join(tmpdir(), "unicode-server-"));
  const content = join(root, "résumé-日本-🐈");
  await mkdir(content);
  const service = await createService(paths(join(root, "state")));
  try {
    const response = new Promise<number>((resolve, reject) => {
      const req = request(
        {
          socketPath: service.socket,
          path: "/config",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode ?? 0));
        },
      );
      req.on("error", reject);
      void (async () => {
        for (const byte of Buffer.from(
          JSON.stringify({ ...DEFAULT_CONFIG, roots: [content], paused: true }),
        )) {
          req.write(Buffer.from([byte]));
          await delay(1);
        }
        req.end();
      })();
    });
    assert.equal(await response, 200);
    assert.deepEqual(
      (await new LocalClient(service.socket).status()).config.roots,
      [await realpath(content)],
    );
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
