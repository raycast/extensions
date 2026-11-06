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
