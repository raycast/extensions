import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, chmod, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths } from "../service/paths";
import { createService } from "../service/server";
import { LocalClient } from "../service/client";
import { DEFAULT_CONFIG } from "../service/protocol";

// A real slow executable exposes races across async model checks without loading a model.
test("concurrent requests reserve one worker slot before awaiting readiness", async () => {
  const root = await mkdtemp(join(tmpdir(), "ls-race-"));
  const locations = paths(join(root, "state"));
  const content = join(root, "docs");
  await mkdir(content);
  await mkdir(join(locations.base, "bin"), { recursive: true });
  await mkdir(locations.models);
  for (const [name, bytes] of [
    ["embeddinggemma-2-Q8_0.gguf", 309855456],
    ["mmproj-embeddinggemma-2-Q8_0.gguf", 554821024],
  ] as const) {
    const file = await open(join(locations.models, name), "w");
    await file.truncate(bytes);
    await file.close();
  }
  await writeFile(
    locations.engine,
    `#!${process.execPath}\nsetTimeout(() => { console.log('[]'); }, 200);\n`,
  );
  await chmod(locations.engine, 0o755);
  const service = await createService(locations);
  const client = new LocalClient(service.socket);
  try {
    await client.configure({
      ...DEFAULT_CONFIG,
      roots: [content],
      paused: true,
    });
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) => client.search(`query ${index}`)),
    );
    assert.equal(
      outcomes.filter((outcome) => outcome.status === "fulfilled").length,
      1,
    );
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    assert.ok(failure?.status === "rejected");
    assert.match(String(failure.reason), /already running/);
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});
