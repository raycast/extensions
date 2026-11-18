import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { SAVE } from "./fixtures";

async function thumbnailSession(supportPath: string) {
  const source = await readFile(join(__dirname, "../src/lib/thumbnails.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports: Partial<typeof import("../src/lib/thumbnails")> = {};
  const requireModule = createRequire(__filename);
  const replacements = new Map<string, unknown>([
    ["@raycast/api", { environment: { supportPath } }],
    [
      "../api/client",
      { pond: () => ({ thumbnail: async () => ({ type: "image/webp", bytes: Buffer.from("thumbnail") }) }) },
    ],
  ]);
  runInNewContext(outputText, {
    exports,
    require: (name: string) => (replacements.has(name) ? replacements.get(name) : requireModule(name)),
  });
  assert.ok(exports.downloadThumbnail);
  return exports.downloadThumbnail;
}

test("keeps thumbnail paths usable past the cache limit and prunes on the next session", async (t) => {
  const supportPath = await mkdtemp(join(tmpdir(), "pond-thumbnails-"));
  t.after(() => rm(supportPath, { recursive: true, force: true }));
  const downloadThumbnail = await thumbnailSession(supportPath);
  const paths: string[] = [];
  for (let index = 0; index < 401; index += 1) {
    const path = await downloadThumbnail({ ...SAVE, id: `save-${index}` }, "medium");
    assert.ok(path);
    paths.push(path);
  }

  for (const path of paths) {
    assert.equal(await readFile(path, "utf8"), "thumbnail");
  }

  const nextSession = await thumbnailSession(supportPath);
  const path = await nextSession({ ...SAVE, id: "save-400" }, "medium");
  assert.ok(path);
  assert.equal(await readFile(path, "utf8"), "thumbnail");
  assert.equal((await readdir(join(supportPath, "thumbnails/medium"))).length, 400);
});

// Drive the hook's effects without Raycast's native renderer.
function thumbnailHooks() {
  let state: ReadonlyMap<string, string | null> | null = null;
  const requested = { current: new Set<string>() };
  const dependencies: unknown[][] = [];
  let effectIndex = 0;
  let effects: (() => void)[] = [];
  let dirty = true;
  return {
    react: {
      useState: () => [
        state,
        (update: (value: typeof state) => typeof state) => {
          state = typeof update === "function" ? update(state) : update;
          dirty = true;
        },
      ],
      useRef: () => requested,
      useCallback: (callback: () => void) => callback,
      useEffect: (effect: () => void, deps: unknown[]) => {
        const index = effectIndex++;
        if (!dependencies[index] || deps.some((dep, i) => !Object.is(dep, dependencies[index][i]))) {
          dependencies[index] = deps;
          effects.push(effect);
        }
      },
    },
    render<T>(hook: () => T): T {
      effectIndex = 0;
      dirty = false;
      const result = hook();
      const pending = effects;
      effects = [];
      pending.forEach((effect) => effect());
      return result;
    },
    get dirty() {
      return dirty;
    },
  };
}

test("refresh retries failed thumbnails without repeating successful or in-flight downloads", async (t) => {
  const { loadSource } = await import("./load-source");
  const { setTimeout } = await import("node:timers/promises");
  const supportPath = await mkdtemp(join(tmpdir(), "pond-thumbnail-retry-"));
  t.after(() => rm(supportPath, { recursive: true, force: true }));
  const hooks = thumbnailHooks();
  const calls = new Map<string, number>();
  let recover = false;
  let finishPending = () => {};
  const pending = new Promise<void>((resolve) => (finishPending = resolve));
  const { useThumbnails } = await loadSource<typeof import("../src/lib/thumbnails")>("lib/thumbnails.ts", {
    "@raycast/api": { environment: { supportPath } },
    react: hooks.react,
    "../api/client": {
      pond: () => ({
        thumbnail: async (id: string) => {
          calls.set(id, (calls.get(id) ?? 0) + 1);
          if (id === "pending") await pending;
          if (id === "failed" && !recover) throw new Error("Temporary outage");
          return { type: "image/webp", bytes: Buffer.from("thumbnail") };
        },
      }),
    },
  });
  const saves = ["failed", "success", "pending"].map((id) => ({ ...SAVE, id }));
  let result = hooks.render(() => useThumbnails(saves, "medium"));
  async function until(done: () => boolean) {
    for (let i = 0; i < 200; i++) {
      if (hooks.dirty) result = hooks.render(() => useThumbnails(saves, "medium"));
      if (done()) return;
      await setTimeout(5);
    }
    assert.fail("Thumbnail work did not finish");
  }
  await until(() => result.paths.get("lib-1-failed") === null && !!result.paths.get("lib-1-success"));
  assert.equal(calls.get("failed"), 1);
  const successfulPath = result.paths.get("lib-1-success");
  result.retry();
  await until(() => calls.get("failed") === 2 && result.paths.get("lib-1-failed") === null);
  assert.equal(calls.get("success"), 1);
  assert.equal(calls.get("pending"), 1);

  recover = true;
  result.retry();
  finishPending();
  await until(() => saves.every((save) => !!result.paths.get(`lib-1-${save.id}`)));
  assert.equal(calls.get("failed"), 3);
  assert.equal(calls.get("success"), 1);
  assert.equal(calls.get("pending"), 1);
  assert.equal(result.paths.get("lib-1-success"), successfulPath);
});
