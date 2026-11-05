import assert from "node:assert/strict";
import fs, { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import { serializeSession } from "../src/lib/migration";
import { createSession } from "./helpers";
import { environment, storage } from "./raycast-api";

let supportPath: string;
let progress: typeof import("../src/lib/session-storage");
before(async () => {
  supportPath = await mkdtemp(join(tmpdir(), "textexpander-progress-"));
  environment.supportPath = supportPath;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      return specifier === "@raycast/api"
        ? { url: pathToFileURL(join(__dirname, "raycast-api.ts")).href, shortCircuit: true }
        : nextResolve(specifier, context);
    },
  });
  progress = await import("../src/lib/session-storage");
});

beforeEach(async () => {
  storage.clear();
  for (const name of await readdir(supportPath)) await rm(join(supportPath, name), { recursive: true, force: true });
});
after(() => rm(supportPath, { recursive: true, force: true }));

test("saved progress round-trips edits, groups, selection, and reference snippets through a private file", async () => {
  const session = createSession();
  session.selectedIds = [session.selectedIds[0]!];
  session.edits[session.selectedIds[0]!] = { name: "Edited", text: "private edited body", keyword: ";edit" };
  session.groupNames.Email = "Personal";
  session.existing = [{ name: "Reference", text: "private comparison body", keyword: ";hi" }];
  await progress.saveProgress(session);
  assert.deepEqual(await progress.loadProgress(), session);
  const files = await readdir(supportPath);
  assert.equal(files.length, 1);
  const snapshot = join(supportPath, files[0]!);
  assert.deepEqual(JSON.parse(await readFile(snapshot, "utf8")), session);
  assert.equal((await stat(snapshot)).mode & 0o777, 0o600);
  assert.ok([...storage.values()].every((value) => value.length < 200 && !value.includes("private")));
  await progress.deleteProgress();
  assert.deepEqual(await readdir(supportPath), []);
  assert.equal(storage.size, 0);
  assert.equal(await progress.loadProgress(), undefined);
  await progress.deleteProgress();
});

test("legacy LocalStorage snapshots migrate to disk without losing saved edits", async () => {
  const session = createSession();
  storage.set("migration-progress-v1", serializeSession(session));
  assert.deepEqual(await progress.loadProgress(), session);
  assert.equal(storage.has("migration-progress-v1"), false);
  assert.equal((await readdir(supportPath)).length, 1);
  assert.deepEqual(await progress.loadProgress(), session);
});

test("a failed snapshot replacement preserves the previous snapshot and removes the temporary file", async (t) => {
  const session = createSession();
  await progress.saveProgress(session);
  const failure = new Error("No space left on device");
  t.mock.method(
    fs,
    "rename",
    async () => {
      throw failure;
    },
    { times: 1 },
  );
  await assert.rejects(progress.saveProgress({ ...session, selectedIds: [] }), (error) => error === failure);
  assert.deepEqual(await progress.loadProgress(), session);
  assert.equal((await readdir(supportPath)).length, 1);
});

test("damaged snapshot files fail explicitly instead of silently starting over", async () => {
  await progress.saveProgress(createSession());
  const [name] = await readdir(supportPath);
  assert.ok(name);
  await writeFile(join(supportPath, name), "broken JSON");
  await assert.rejects(progress.loadProgress(), /damaged/);
});
