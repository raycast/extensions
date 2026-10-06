import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createStorePersistence, STORE_KEY } from "../src/lib/store-persistence.ts";

test("separate command processes preserve concurrent saves, including first initialization", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tallies-processes-"));
  const children = ["template", "attendance"].map((id) =>
    fork(new URL("./fixtures/store-worker.ts", import.meta.url), [directory, id], {
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    }),
  );
  try {
    const exits = children.map((child) => once(child, "exit"));
    await Promise.all(children.map((child) => once(child, "message")));
    children.forEach((child) => child.send("start"));
    for (const [code] of await Promise.all(exits)) assert.equal(code, 0);
    const stored = JSON.parse(await readFile(join(directory, STORE_KEY), "utf8"));
    assert.deepEqual(stored.templates.map((t: { id: string }) => t.id).sort(), ["attendance", "default", "template"]);
  } finally {
    children.forEach((child) => child.kill());
    await rm(directory, { recursive: true, force: true });
  }
});

test("fresh reads include other instances' saves and a failed update releases the guard", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tallies-store-"));
  const values = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => values.get(key),
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const first = createStorePersistence(storage, join(directory, "store-write"));
  const second = createStorePersistence(storage, join(directory, "store-write"));
  try {
    const opened = await first.read();
    await assert.rejects(
      first.update(() => {
        throw new Error("Failed update");
      }),
      /Failed update/,
    );
    await second.update((store) => ({ ...store, sharedTimeIn: "9:00 AM" }));
    assert.equal(opened.sharedTimeIn, "");
    assert.equal((await first.read()).sharedTimeIn, "9:00 AM");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
