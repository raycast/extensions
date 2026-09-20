import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { createRegistry, RegistryError, slugify } from "./profiles.ts";

let root: string;
let registry: ReturnType<typeof createRegistry>;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "claude-profiles-"));
  registry = createRegistry(join(root, "Claude Profiles"));
});

afterEach(() => rm(root, { recursive: true, force: true }));

test("slugify collapses punctuation and never returns an empty id", () => {
  assert.equal(slugify("  Client A / B  "), "client-a-b");
  assert.equal(slugify("!!!"), "profile");
});

test("a missing registry is an empty list", async () => {
  assert.deepEqual(await registry.load(), []);
});

test("add registers a folder and load reads it back", async () => {
  const created = await registry.add("Work Laptop");
  assert.equal(created.id, "work-laptop");
  assert.equal(created.dataDir, join(registry.root, "work-laptop"));
  assert.deepEqual(await registry.load(), [created]);
  assert.deepEqual(await readdir(registry.root).then((n) => n.sort()), [
    "profiles.json",
    "work-laptop",
  ]);
});

test("a corrupt registry is an error, not an empty list, and is left alone", async () => {
  await mkdir(registry.root, { recursive: true });
  await writeFile(registry.path, "{not json");
  await assert.rejects(registry.load(), RegistryError);
  await assert.rejects(registry.add("Work"), RegistryError);
  assert.equal(await readFile(registry.path, "utf8"), "{not json");
});

test("a row missing a field rejects the registry so a later save cannot drop it", async () => {
  await mkdir(registry.root, { recursive: true });
  const body = JSON.stringify({
    version: 1,
    profiles: [
      { id: "a" },
      { id: "b", name: "B", dataDir: join(registry.root, "b") },
    ],
  });
  await writeFile(registry.path, body);
  await assert.rejects(registry.load(), /row 1 lacks/);
  await assert.rejects(registry.add("Work"), RegistryError);
  assert.equal(await readFile(registry.path, "utf8"), body);
});

test("createdAt defaults to zero when the row omits it", async () => {
  await mkdir(registry.root, { recursive: true });
  await writeFile(
    registry.path,
    JSON.stringify({
      version: 1,
      profiles: [{ id: "b", name: "B", dataDir: join(registry.root, "b") }],
    }),
  );
  assert.deepEqual(
    (await registry.load()).map((p) => [p.id, p.createdAt]),
    [["b", 0]],
  );
});

test("a name whose folder still exists gets a new id instead of the old login", async () => {
  await registry.add("Work");
  await registry.remove("work", false);
  assert.deepEqual(await registry.load(), []);
  assert.equal(await registry.orphanFor("Work"), join(registry.root, "work"));

  const fresh = await registry.add("Work");
  assert.equal(fresh.id, "work-2");
  assert.deepEqual(await registry.orphans(), [join(registry.root, "work")]);
});

test("restore puts an orphan folder back under its own id", async () => {
  const first = await registry.add("Work");
  await registry.remove("work", false);
  const back = await registry.restore(first.dataDir, "Work again");
  assert.equal(back.id, "work");
  assert.equal(back.name, "Work again");
  assert.equal(back.dataDir, first.dataDir);
  assert.deepEqual(await registry.orphans(), []);
});

test("rename changes the name and nothing else", async () => {
  const created = await registry.add("Work");
  const renamed = await registry.rename("work", "Client A");
  assert.deepEqual(renamed, { ...created, name: "Client A" });
  assert.deepEqual(await registry.load(), [renamed]);
  await assert.rejects(registry.rename("work", "   "));
});

test("remove with discardData hands back the folder inside the root, deleting nothing itself", async () => {
  const created = await registry.add("Work");
  const doomed = await registry.remove("work", true);
  assert.equal(doomed, await realpath(created.dataDir));
  assert.deepEqual(await registry.load(), []);
  assert.deepEqual(await readdir(created.dataDir), []);

  await registry.add("Gone");
  await rm(join(registry.root, "gone"), { recursive: true });
  assert.equal(await registry.remove("gone", true), null);
});

test("remove refuses to delete a folder outside the root and keeps the row", async () => {
  const outside = join(root, "elsewhere");
  await mkdir(outside);
  await mkdir(join(root, "Claude Profiles", "work"), { recursive: true });
  await writeFile(join(outside, "keep"), "x");
  await mkdir(registry.root, { recursive: true });
  await writeFile(
    registry.path,
    JSON.stringify({
      version: 1,
      profiles: [
        { id: "stray", name: "Stray", dataDir: outside, createdAt: 1 },
      ],
    }),
  );
  await assert.rejects(registry.remove("stray", true), /outside/);
  assert.equal((await registry.load()).length, 1);
  assert.deepEqual(await readdir(outside), ["keep"]);

  await assert.rejects(registry.confineFolder(registry.root), /outside/);
  await assert.rejects(registry.confineFolder(outside), /outside/);
  assert.equal(
    await registry.confineFolder(join(registry.root, "work")),
    await realpath(join(registry.root, "work")),
  );
});

test("saving leaves no temp file behind", async () => {
  await registry.add("One");
  await registry.add("Two");
  const names = await readdir(registry.root);
  assert.ok(
    names.every((n) => !n.endsWith(".tmp")),
    names.join(","),
  );
  const written = JSON.parse(await readFile(registry.path, "utf8"));
  assert.equal(written.version, 1);
  assert.deepEqual(
    written.profiles.map((p: { id: string }) => p.id),
    ["one", "two"],
  );
});
