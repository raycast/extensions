import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { downloadVerified } from "../src/tools";

test("component download verifies integrity, cleans partial files and preserves existing files", async () => {
  const bytes = Buffer.from("verified component fixture");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Length": bytes.length });
    response.end(bytes);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const directory = await mkdtemp(join(tmpdir(), "social-downloader-test-"));
  const file = join(directory, "component.exe");
  const signal = new AbortController().signal;
  try {
    const url = `http://127.0.0.1:${address.port}/component`;
    await downloadVerified(url, file, hash, signal, () => {});
    assert.deepEqual(await readFile(file), bytes);
    const corrupted = join(directory, "corrupted.exe");
    await assert.rejects(
      downloadVerified(url, corrupted, "0".repeat(64), signal, () => {}),
      /verification/,
    );
    await assert.rejects(stat(corrupted), { code: "ENOENT" });
    await writeFile(file, "existing");
    await assert.rejects(
      downloadVerified(url, file, hash, signal, () => {}),
      { code: "EEXIST" },
    );
    assert.equal(await readFile(file, "utf8"), "existing");
    const aborted = new AbortController();
    aborted.abort();
    const cancelled = join(directory, "cancelled.exe");
    await assert.rejects(
      downloadVerified(url, cancelled, hash, aborted.signal, () => {}),
    );
    await assert.rejects(stat(cancelled), { code: "ENOENT" });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
